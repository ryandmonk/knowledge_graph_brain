import { z } from 'zod';
import { OrchestratorClient } from '../client/orchestrator.js';
import { SessionManager } from '../config.js';

/**
 * Knowledge base management and administration tools
 */
export class KnowledgeManagementTools {
  constructor(
    private client: OrchestratorClient,
    private sessionManager: SessionManager
  ) {}

  /**
   * Switch between knowledge bases
   */
  switchKnowledgeBase = {
    name: 'switch_knowledge_base',
    description: 'Switch to a different knowledge base or create a new one. This sets the context for all subsequent queries.',
    inputSchema: z.object({
      kb_id: z.string().describe('Knowledge base identifier to switch to'),
      create_if_missing: z.boolean().optional().default(false).describe('Create the knowledge base if it doesn\'t exist')
    }),
    handler: async (args: any, sessionId: string) => {
      try {
        // Check if KB exists
        const existingKBs = await this.client.listKnowledgeBases();
        const kbExists = existingKBs.some(kb => kb.kb_id === args.kb_id);

        if (!kbExists && !args.create_if_missing) {
          return {
            error: `Knowledge base '${args.kb_id}' does not exist.`,
            available_knowledge_bases: existingKBs.map(kb => ({
              id: kb.kb_id,
              status: kb.health_status,
              total_nodes: kb.total_nodes,
              total_relationships: kb.total_relationships,
              data_freshness_hours: kb.data_freshness_hours
            })),
            suggestion: 'Use create_if_missing: true to create a new knowledge base, or choose from available ones.'
          };
        }

        if (!kbExists && args.create_if_missing) {
          // Create new knowledge base with basic schema
          const basicSchema = `
knowledge_base: ${args.kb_id}
entities:
  - type: Document
    properties: [title, content, source]
  - type: Person
    properties: [name, email, role]
relationships:
  - type: AUTHORED_BY
    from: Document
    to: Person
          `;
          
          await this.client.registerSchema({
            kb_id: args.kb_id,
            schema_yaml: basicSchema
          });
        }

        // Update session context
        this.sessionManager.updateSession(sessionId, {
          currentKnowledgeBase: args.kb_id
        });

        // Get updated KB info
        const updatedKBs = await this.client.listKnowledgeBases();
        const currentKB = updatedKBs.find(kb => kb.kb_id === args.kb_id);

        return {
          success: true,
          switched_to: args.kb_id,
          knowledge_base_info: currentKB ? {
            id: currentKB.kb_id,
            status: currentKB.health_status,
            total_nodes: currentKB.total_nodes,
            total_relationships: currentKB.total_relationships,
            data_freshness_hours: currentKB.data_freshness_hours,
            created_new: !kbExists
          } : null,
          message: kbExists 
            ? `Switched to knowledge base: ${args.kb_id}`
            : `Created and switched to new knowledge base: ${args.kb_id}`
        };

      } catch (error) {
        return {
          error: `Failed to switch knowledge base: ${error instanceof Error ? error.message : 'Unknown error'}`,
          kb_id: args.kb_id
        };
      }
    }
  };

  /**
   * List all available knowledge bases
   */
  listKnowledgeBases = {
    name: 'list_knowledge_bases',
    description: 'List all available knowledge bases with their status and metadata.',
    inputSchema: z.object({
      include_stats: z.boolean().optional().default(true).describe('Include detailed statistics for each knowledge base')
    }),
    handler: async (args: any, sessionId: string) => {
      try {
        const kbs = await this.client.listKnowledgeBases();
        const session = this.sessionManager.getSession(sessionId);

        const knowledgeBases = kbs.map(kb => ({
          id: kb.kb_id,
          status: kb.health_status,
          total_nodes: kb.total_nodes,
          total_relationships: kb.total_relationships,
          data_freshness_hours: kb.data_freshness_hours,
          is_current: kb.kb_id === session.currentKnowledgeBase,
          ...(args.include_stats ? {
            node_types: kb.node_types
          } : {})
        }));

        return {
          knowledge_bases: knowledgeBases,
          total_count: knowledgeBases.length,
          current_kb: session.currentKnowledgeBase || 'none',
          summary: {
            healthy: knowledgeBases.filter(kb => kb.status === 'healthy').length,
            warning: knowledgeBases.filter(kb => kb.status === 'warning').length,
            error: knowledgeBases.filter(kb => kb.status === 'error').length,
            stale: knowledgeBases.filter(kb => kb.status === 'stale').length
          }
        };

      } catch (error) {
        return {
          error: `Failed to list knowledge bases: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }
  };

  /**
   * Add a new data source to the current knowledge base
   */
  addDataSource = {
    name: 'add_data_source',
    description: 'Add a new data source (GitHub repo, Slack channel, Confluence space, etc.) to the current knowledge base.',
    inputSchema: z.object({
      source_id: z.string().describe('Unique identifier for this source'),
      connector_url: z.string().describe('URL of the connector service (e.g., "http://github-connector:3001")'),
      kb_id: z.string().optional().describe('Knowledge base ID (optional - uses current context)'),
      auth_ref: z.string().optional().describe('Authentication reference/token')
    }),
    handler: async (args: any, sessionId: string) => {
      const session = this.sessionManager.getSession(sessionId);
      const kb_id = args.kb_id || session.currentKnowledgeBase;
      
      if (!kb_id) {
        return {
          error: 'No knowledge base specified. Use switch_knowledge_base tool first or provide kb_id parameter.',
          available_knowledge_bases: await this.getAvailableKBs()
        };
      }

      try {
        const result = await this.client.addDataSource({
          kb_id,
          source_id: args.source_id,
          connector_url: args.connector_url,
          auth_ref: args.auth_ref
        });

        // Update session
        this.sessionManager.updateSession(sessionId, {
          currentKnowledgeBase: kb_id
        });

        return {
          success: result.success,
          source_id: args.source_id,
          connector_url: args.connector_url,
          kb_id,
          message: result.message,
          next_step: 'Use the start_ingestion tool to begin syncing data from this source.'
        };

      } catch (error) {
        return {
          error: `Failed to add data source: ${error instanceof Error ? error.message : 'Unknown error'}`,
          source_id: args.source_id,
          kb_id
        };
      }
    }
  };

  /**
   * Start data ingestion from a source
   */
  startIngestion = {
    name: 'start_ingestion',
    description: 'Start data ingestion from a configured data source.',
    inputSchema: z.object({
      source_id: z.string().describe('Source ID to ingest from'),
      kb_id: z.string().optional().describe('Knowledge base ID (optional - uses current context)')
    }),
    handler: async (args: any, sessionId: string) => {
      const session = this.sessionManager.getSession(sessionId);
      const kb_id = args.kb_id || session.currentKnowledgeBase;
      
      if (!kb_id) {
        return {
          error: 'No knowledge base specified. Use switch_knowledge_base tool first or provide kb_id parameter.',
          available_knowledge_bases: await this.getAvailableKBs()
        };
      }

      try {
        const result = await this.client.ingestData({
          kb_id,
          source_id: args.source_id
        });

        return {
          success: result.success,
          run_id: result.run_id,
          source_id: args.source_id,
          kb_id,
          message: result.message,
          track_progress: 'Use get_kb_status tool to monitor ingestion progress'
        };

      } catch (error) {
        return {
          error: `Failed to start ingestion: ${error instanceof Error ? error.message : 'Unknown error'}`,
          source_id: args.source_id,
          kb_id
        };
      }
    }
  };

  /**
   * Get knowledge base status and sources
   */
  getKBStatus = {
    name: 'get_kb_status',
    description: 'Get detailed status of a knowledge base including sources and recent ingestion runs.',
    inputSchema: z.object({
      kb_id: z.string().optional().describe('Knowledge base ID (optional - uses current context)')
    }),
    handler: async (args: any, sessionId: string) => {
      const session = this.sessionManager.getSession(sessionId);
      const kb_id = args.kb_id || session.currentKnowledgeBase;
      
      if (!kb_id) {
        return {
          error: 'No knowledge base specified. Use switch_knowledge_base tool first or provide kb_id parameter.',
          available_knowledge_bases: await this.getAvailableKBs()
        };
      }

      try {
        const status = await this.client.getKnowledgeBaseStatus(kb_id);
        
        return {
          kb_id,
          total_nodes: status.total_nodes,
          total_relationships: status.total_relationships,
          sources: status.sources.map((source: any) => ({
            source_id: source.source_id,
            status: source.status || 'unknown',
            last_run: source.last_run,
            documents_processed: source.documents_processed || 0,
            errors: source.errors || []
          })),
          last_error: status.last_error,
          summary: {
            total_sources: status.sources.length,
            healthy_sources: status.sources.filter((s: any) => !s.errors || s.errors.length === 0).length,
            error_sources: status.sources.filter((s: any) => s.errors && s.errors.length > 0).length
          }
        };

      } catch (error) {
        return {
          error: `Failed to get knowledge base status: ${error instanceof Error ? error.message : 'Unknown error'}`,
          kb_id
        };
      }
    }
  };

  /**
   * Configure or update knowledge base schema
   */
  updateSchema = {
    name: 'update_schema',
    description: 'Update the knowledge base schema to define entity types and relationships for better organization.',
    inputSchema: z.object({
      kb_id: z.string().optional().describe('Knowledge base ID (optional - uses current context)'),
      schema_yaml: z.string().describe('Complete schema in YAML format defining entities, relationships, and mappings')
    }),
    handler: async (args: any, sessionId: string) => {
      const session = this.sessionManager.getSession(sessionId);
      const kb_id = args.kb_id || session.currentKnowledgeBase;
      
      if (!kb_id) {
        return {
          error: 'No knowledge base specified. Use switch_knowledge_base tool first or provide kb_id parameter.',
          available_knowledge_bases: await this.getAvailableKBs()
        };
      }

      try {
        const result = await this.client.registerSchema({
          kb_id,
          schema_yaml: args.schema_yaml
        });

        return {
          success: result.success,
          kb_id,
          message: result.message,
          note: 'Schema updated successfully. Changes will apply to future data ingestion.',
          example_yaml: `
knowledge_base: ${kb_id}
embedding:
  provider: openai
  chunking:
    strategy: recursive
    chunk_size: 1000
schema:
  nodes:
    - label: Document
      key: title
      props: [content, source, created_at]
    - label: Person  
      key: name
      props: [email, role, department]
  relationships:
    - type: AUTHORED_BY
      from: Document
      to: Person
mappings:
  sources:
    - source_id: github_docs
      document_type: markdown
      extract:
        node: Document
        assign:
          title: "$.name"
          content: "$.content"
      edges:
        - type: AUTHORED_BY
          from:
            node: Document
            key: "$.name"
          to:
            node: Person
            key: "$.author.name"
          `
        };

      } catch (error) {
        return {
          error: `Failed to update schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
          kb_id,
          help: 'Schema must be valid YAML with knowledge_base, embedding, schema, and mappings sections.'
        };
      }
    }
  };

  private async getAvailableKBs(): Promise<string[]> {
    try {
      const kbs = await this.client.listKnowledgeBases();
      return kbs.map(kb => kb.kb_id);
    } catch (error) {
      return [];
    }
  }
}
