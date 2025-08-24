import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { parseSchema, applyMapping } from '../dsl/index.js';
import { ConnectorClient } from '../connectors/index.js';
import { mergeNodesAndRels, semanticSearch, executeCypher } from '../ingest/index.js';
import { EmbeddingProviderFactory } from '../embeddings/index.js';
import { startRun, updateRunStats, completeRun, addRunError, getKnowledgeBaseStatus } from '../status/index.js';

// Define the structure for our schema
export interface Schema {
  kb_id: string;
  embedding: {
    provider: string;
    chunking: {
      strategy: string;
      [key: string]: any; // For additional chunking parameters
    };
  };
  schema: {
    nodes: Array<{
      label: string;
      key: string;
      props: string[];
    }>;
    relationships: Array<{
      type: string;
      from: string;
      to: string;
      props?: string[];
    }>;
  };
  mappings: {
    sources: Array<{
      source_id: string;
      document_type: string;
      extract: {
        node: string;
        assign: { [key: string]: string }; // JSONPath expressions
      };
      edges: Array<{
        type: string;
        from: {
          node: string;
          key: string; // JSONPath expression
        };
        to: {
          node: string;
          key: string; // JSONPath expression
          props?: { [key: string]: string }; // JSONPath expressions
        };
      }>;
    }>;
  };
}

// Define the structure for source configuration
export interface SourceConfig {
  kb_id: string;
  source_id: string;
  connector_url: string;
  auth_ref: string;
  mapping_name: string;
}

// In-memory storage for schemas and sources (in production, this would be a database)
const registeredSchemas: Map<string, Schema> = new Map();
const registeredSources: Map<string, SourceConfig> = new Map();

// Create a server instance
const server = new McpServer(
  {
    name: 'Knowledge Graph Orchestrator',
    version: '1.0.0',
  },
  {
    capabilities: {},
  }
);

// Capability 1: register_schema
server.registerTool(
  'register_schema',
  {
    title: 'Register Schema',
    description: 'Register a domain schema for a knowledge base',
    inputSchema: {
      kb_id: z.string().describe('Knowledge base ID'),
      schema_yaml: z.string().describe('Schema in YAML format'),
    },
  },
  async ({ kb_id, schema_yaml }: { kb_id: string; schema_yaml: string }) => {
    try {
      // Parse and validate the YAML schema
      const schema = parseSchema(schema_yaml);
      
      // Verify the kb_id matches
      if (schema.kb_id !== kb_id) {
        throw new Error(`Schema kb_id '${schema.kb_id}' does not match provided kb_id '${kb_id}'`);
      }

      // Store the parsed schema
      registeredSchemas.set(kb_id, schema);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ 
              ok: true, 
              kb_id: schema.kb_id,
              nodes_count: schema.schema.nodes.length,
              relationships_count: schema.schema.relationships.length,
              sources_count: schema.mappings.sources.length
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ok: false, errors: [(error as Error).message] }),
          },
        ],
      };
    }
  }
);

// Capability 2: add_source
server.registerTool(
  'add_source',
  {
    title: 'Add Source',
    description: 'Add a data source to a knowledge base',
    inputSchema: {
      kb_id: z.string().describe('Knowledge base ID'),
      source_id: z.string().describe('Source ID'),
      connector_url: z.string().describe('Connector URL'),
      auth_ref: z.string().describe('Authentication reference'),
      mapping_name: z.string().describe('Mapping name'),
    },
  },
  async ({
    kb_id,
    source_id,
    connector_url,
    auth_ref,
    mapping_name,
  }: {
    kb_id: string;
    source_id: string;
    connector_url: string;
    auth_ref: string;
    mapping_name: string;
  }) => {
    // Check if the KB exists
    if (!registeredSchemas.has(kb_id)) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ok: false,
              error: `Knowledge base '${kb_id}' not found. Please register the schema first.`,
            }),
          },
        ],
      };
    }

    const sourceKey = `${kb_id}:${source_id}`;
    registeredSources.set(sourceKey, {
      kb_id,
      source_id,
      connector_url,
      auth_ref,
      mapping_name,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ ok: true }),
        },
      ],
    };
  }
);

// Capability 3: ingest
server.registerTool(
  'ingest',
  {
    title: 'Ingest Data',
    description: 'Ingest data from a source into a knowledge base',
    inputSchema: {
      kb_id: z.string().describe('Knowledge base ID'),
      source_id: z.string().describe('Source ID'),
      since: z.string().optional().describe('Timestamp to ingest from'),
    },
  },
  async ({ kb_id, source_id, since }: { kb_id: string; source_id: string; since?: string }) => {
    const sourceKey = `${kb_id}:${source_id}`;
    const source = registeredSources.get(sourceKey);
    const schema = registeredSchemas.get(kb_id);

    if (!source) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: `Source '${source_id}' not found for knowledge base '${kb_id}'.`,
            }),
          },
        ],
      };
    }

    if (!schema) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: `Schema for knowledge base '${kb_id}' not found.`,
            }),
          },
        ],
      };
    }

    try {
      // Generate unique run ID
      const run_id = `run-${Date.now()}`;
      
      // Start tracking this ingestion run
      startRun(kb_id, source_id, run_id);
      
      // 1. Call the connector's pull method
      const connector = new ConnectorClient(source.connector_url, source.auth_ref);
      const { documents } = await connector.pull(since);
      
      // 2. Find the mapping for this source
      const mapping = schema.mappings.sources.find(s => s.source_id === source_id);
      if (!mapping) {
        addRunError(run_id, `No mapping found for source '${source_id}' in schema`);
        completeRun(run_id, 'failed');
        throw new Error(`No mapping found for source '${source_id}' in schema`);
      }
      
      // 3. Apply mapping to extract nodes and relationships
      let totalNodes = 0;
      let totalRels = 0;
      let processedDocs = 0;
      const runErrors: string[] = [];
      
      for (const document of documents) {
        try {
          const { nodes, relationships } = applyMapping(document, mapping);
          
          // 4. Merge nodes/relationships into Neo4j with provenance
          const { createdNodes, createdRels } = await mergeNodesAndRels(
            kb_id,
            source_id,
            run_id,
            nodes,
            relationships
          );
          
          totalNodes += createdNodes;
          totalRels += createdRels;
          processedDocs++;
          
          // Update run stats periodically
          if (processedDocs % 10 === 0) {
            updateRunStats(run_id, {
              nodes_processed: totalNodes,
              relationships_created: totalRels
            });
          }
          
        } catch (docError) {
          const errorMessage = `Failed to process document: ${docError instanceof Error ? docError.message : docError}`;
          console.error(errorMessage);
          runErrors.push(errorMessage);
          addRunError(run_id, errorMessage);
          // Continue processing other documents
        }
      }
      
      // Final update of run stats
      updateRunStats(run_id, {
        nodes_processed: totalNodes,
        relationships_created: totalRels
      });
      
      // TODO: 5. Generate embeddings and update vector index
      // TODO: 6. Write detailed provenance records
      
      // Complete the run - successful if we processed any docs, failed if all failed
      const status = processedDocs > 0 ? 'completed' : 'failed';
      completeRun(run_id, status);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              run_id,
              processed: processedDocs,
              created_nodes: totalNodes,
              created_rels: totalRels,
              errors: runErrors,
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: `Ingestion failed: ${(error as Error).message}`,
            }),
          },
        ],
      };
    }
  }
);

// Capability 4: search_graph
server.registerTool(
  'search_graph',
  {
    title: 'Search Graph',
    description: 'Execute a Cypher query against the knowledge graph',
    inputSchema: {
      kb_id: z.string().describe('Knowledge base ID'),
      cypher: z.string().describe('Cypher query'),
      params: z.record(z.string(), z.unknown()).optional().describe('Query parameters'),
    },
  },
  async ({ kb_id, cypher, params }: { kb_id: string; cypher: string; params?: object }) => {
    try {
      // Execute the Cypher query against Neo4j
      const queryParams = { ...params, kb_id };
      const rows = await executeCypher(cypher, queryParams);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              rows,
              count: rows.length,
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: `Query execution failed: ${(error as Error).message}`,
            }),
          },
        ],
      };
    }
  }
);

// Capability 5: semantic_search
server.registerTool(
  'semantic_search',
  {
    title: 'Semantic Search',
    description: 'Perform semantic search using vector embeddings',
    inputSchema: {
      kb_id: z.string().describe('Knowledge base ID'),
      text: z.string().describe('Search text'),
      top_k: z.number().describe('Number of results to return'),
      filters: z
        .object({
          labels: z.array(z.string()).optional(),
          props: z.record(z.string(), z.unknown()).optional(),
        })
        .optional()
        .describe('Search filters'),
    },
  },
  async ({
    kb_id,
    text,
    top_k,
    filters,
  }: {
    kb_id: string;
    text: string;
    top_k: number;
    filters?: { labels?: string[]; props?: object };
  }) => {
    try {
      // Get the schema to find the embedding provider
      const schema = registeredSchemas.get(kb_id);
      if (!schema) {
        throw new Error(`Schema for knowledge base '${kb_id}' not found`);
      }

      // Generate embeddings for the search text
      const embeddingProvider = EmbeddingProviderFactory.create(schema.embedding.provider);
      const queryVector = await embeddingProvider.embed(text) as number[];

      // Perform semantic search using vector embeddings
      const results = await semanticSearch(kb_id, queryVector, top_k, filters);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(results),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: `Semantic search failed: ${(error as Error).message}`,
            }),
          },
        ],
      };
    }
  }
);

// Capability 6: sync_status
server.registerTool(
  'sync_status',
  {
    title: 'Sync Status',
    description: 'Get the synchronization status of a knowledge base',
    inputSchema: {
      kb_id: z.string().describe('Knowledge base ID'),
    },
  },
  async ({ kb_id }: { kb_id: string }) => {
    try {
      const status = await getKnowledgeBaseStatus(kb_id);
      
      if (!status) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `Knowledge base '${kb_id}' not found`,
              }),
            },
          ],
        };
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(status),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: `Status sync failed: ${error instanceof Error ? error.message : error}`,
            }),
          },
        ],
      };
    }
  }
);

// Export the server instance and types for use in other modules
export { server, registeredSchemas, registeredSources };