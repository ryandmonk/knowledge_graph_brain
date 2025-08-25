// Update the main index.ts file to integrate all components
import express, { Request, Response } from 'express';
import { server, registeredSchemas } from './capabilities';
import { initDriver, setupKB, mergeNodesAndRels, executeCypher, getDriver, semanticSearch } from './ingest';
import { parseSchema, applyMapping } from './dsl';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'crypto';
import { syncStatusHandler, runsHandler, getSystemStatus } from './status/index';
import { config } from './config';
import { EmbeddingProviderFactory } from './embeddings/index';
import axios from 'axios';

// Initialize Neo4j driver
initDriver();

const app = express();

app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'mcp-orchestrator' });
});

// Simple REST endpoints for testing
app.post('/api/register-schema', async (req: Request, res: Response) => {
  try {
    const { kb_id, schema_yaml } = req.body;
    
    if (!kb_id || !schema_yaml) {
      return res.status(400).json({ error: 'Missing kb_id or schema_yaml' });
    }
    
    // Parse and validate the schema
    const schema = parseSchema(schema_yaml);
    
    // Store the schema in memory for the MCP system
    registeredSchemas.set(kb_id, schema);
    
    // Setup the knowledge base in Neo4j
    await setupKB(kb_id, schema);
    
    console.log(`✅ Schema registered for KB: ${kb_id}`);
    
    res.json({ 
      success: true, 
      message: 'Schema registered successfully',
      kb_id: kb_id,
      nodes: schema.schema.nodes.length,
      relationships: schema.schema.relationships.length
    });
  } catch (error) {
    console.error('Schema registration error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/api/ingest', async (req: Request, res: Response) => {
  try {
    const { kb_id, source_id } = req.body;
    
    if (!kb_id || !source_id) {
      return res.status(400).json({ error: 'Missing kb_id or source_id' });
    }
    
    // Retrieve the registered schema for this KB
    const schema = registeredSchemas.get(kb_id);
    if (!schema) {
      return res.status(400).json({ 
        error: `No schema registered for kb_id: ${kb_id}. Please register a schema first using /api/register-schema`,
        available_kbs: Array.from(registeredSchemas.keys())
      });
    }    // Find the mapping for this source
    const mapping = schema.mappings.sources.find(s => s.source_id === source_id);
    if (!mapping) {
      return res.status(400).json({ 
        error: `No mapping found for source_id: ${source_id}`,
        available_sources: schema.mappings.sources.map(s => s.source_id)
      });
    }
    
    // Get connector URL from mapping (with fallback for backward compatibility)
    let connectorUrl = (mapping as any).connector_url;
    if (!connectorUrl) {
      // Fallback logic for schemas without explicit connector_url
      if (source_id === 'products' || source_id === 'customers') {
        connectorUrl = `http://localhost:8081/data/${source_id}`;
      } else if (source_id === 'confluence') {
        connectorUrl = 'http://localhost:3001/pull';
      } else {
        return res.status(400).json({ 
          error: `No connector_url found for source_id: ${source_id}. Please update schema to include connector_url in mapping.`,
          mapping_format: 'sources:\n  - source_id: "your-source"\n    connector_url: "http://localhost:port/endpoint"'
        });
      }
    }
    
    // Fetch data from the connector
    let response;
    try {
      response = await axios.get(connectorUrl);
    } catch (error) {
      return res.status(503).json({ 
        error: `Failed to connect to connector at ${connectorUrl}. Ensure connector is running.`,
        connector_url: connectorUrl,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // Handle different response formats
    let documents;
    if (source_id === 'confluence') {
      documents = response.data; // Confluence returns array directly
    } else {
      documents = response.data.data || response.data; // Retail returns {data: [...]}
    }
    
    const run_id = randomUUID();
    let totalNodes = 0;
    let totalRels = 0;
    
    console.log(`🔍 Processing ${documents.length} documents from ${source_id}`);
    
    // Process each document using the schema mapping
    for (const doc of documents) {
      console.log(`📄 Processing document:`, doc);
      
      // Apply the mapping to extract nodes and relationships directly from the document
      const { nodes, relationships } = applyMapping(doc, mapping, schema);
      
      console.log(`✅ Extracted ${nodes.length} nodes and ${relationships.length} relationships`);
      
      // Convert to the format expected by mergeNodesAndRels (nodes should already have correct key)
      const formattedNodes = nodes.map(node => ({
        label: node.label,
        key: node.key,
        properties: node.properties
      }));
      
      const formattedRels = relationships.map(rel => ({
        type: rel.type,
        from: {
          label: rel.from.label,
          key: rel.from.key
        },
        to: {
          label: rel.to.label,
          key: rel.to.key
        },
        properties: rel.properties
      }));
      
      // Merge into Neo4j
      const { createdNodes, createdRels } = await mergeNodesAndRels(
        kb_id,
        source_id,
        run_id,
        formattedNodes,
        formattedRels
      );
      
      totalNodes += createdNodes;
      totalRels += createdRels;
    }
    
    console.log(`✅ Ingested data for KB: ${kb_id}, Source: ${source_id}, Nodes: ${totalNodes}, Relationships: ${totalRels}`);
    
    res.json({ 
      success: true, 
      message: 'Data ingested successfully',
      kb_id: kb_id,
      source_id: source_id,
      run_id: run_id,
      processed_documents: documents.length,
      created_nodes: totalNodes,
      created_relationships: totalRels
    });
  } catch (error) {
    console.error('Ingestion error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/api/semantic-search', async (req: Request, res: Response) => {
  try {
    const { kb_id, text, top_k = 5, filters } = req.body;
    
    if (!kb_id || !text) {
      res.status(400).json({ 
        error: 'Missing required parameters: kb_id and text are required' 
      });
      return;
    }
    
    // Get the schema to find the embedding provider
    const schema = registeredSchemas.get(kb_id);
    if (!schema) {
      res.status(404).json({ 
        error: `Schema for knowledge base '${kb_id}' not found. Please register the schema first.` 
      });
      return;
    }

    // Generate embeddings for the search text
    const embeddingProvider = EmbeddingProviderFactory.create(schema.embedding.provider);
    const queryVector = await embeddingProvider.embed(text) as number[];

    // Perform semantic search using vector embeddings with filters
    const results = await semanticSearch(kb_id, queryVector, top_k, filters);

    res.json({
      found: results.length,
      results: results.map(result => ({
        node_id: result.node.id || result.node.kb_id + '_' + (result.node.source_id || 'unknown'),
        score: result.score,
        content: result.node,
        filters_applied: filters ? {
          labels: filters.labels,
          properties: filters.props ? Object.keys(filters.props) : undefined
        } : undefined
      })),
      query: text,
      kb_id,
      embedding_provider: schema.embedding.provider
    });
  } catch (error) {
    console.error('Semantic search error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/search-graph', async (req: Request, res: Response) => {
  try {
    const { kb_id, cypher } = req.body;
    
    // Execute the real Cypher query against Neo4j
    console.log(`Executing Cypher query: ${cypher}`);
    const results = await executeCypher(cypher, { kb_id });
    
    res.json({
      rows: results,
      query: cypher,
      kb_id: kb_id,
      count: results.length
    });
  } catch (error) {
    console.error('Graph search error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Status API endpoints
app.get('/api/status', async (req: Request, res: Response) => {
  try {
    const status = await getSystemStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.get('/api/sync-status/:kb_id', syncStatusHandler);
app.get('/api/runs/:kb_id?', runsHandler);

// Enhanced operational monitoring endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const systemStatus = await getSystemStatus();
    
    // Generate alerts based on system status
    const alerts: Array<{severity: 'info' | 'warning' | 'error', message: string, timestamp: number}> = [];
    
    if (!systemStatus.neo4j_connected) {
      alerts.push({
        severity: 'error',
        message: 'Neo4j database connection failed',
        timestamp: Date.now()
      });
    }
    
    if (systemStatus.health_score < 80) {
      alerts.push({
        severity: 'warning', 
        message: `System health score is low: ${systemStatus.health_score}/100`,
        timestamp: Date.now()
      });
    }
    
    if (systemStatus.active_runs > 10) {
      alerts.push({
        severity: 'warning',
        message: `High number of active runs: ${systemStatus.active_runs}`,
        timestamp: Date.now()
      });
    }
    
    // Check for stale knowledge bases
    const staleKBs = systemStatus.knowledge_bases.filter(kb => kb.health_status === 'stale' || kb.health_status === 'error');
    if (staleKBs.length > 0) {
      alerts.push({
        severity: 'warning',
        message: `${staleKBs.length} knowledge base(s) need attention: ${staleKBs.map(kb => kb.kb_id).join(', ')}`,
        timestamp: Date.now()
      });
    }
    
    res.json({
      status: systemStatus,
      alerts,
      summary: {
        healthy_kbs: systemStatus.knowledge_bases.filter(kb => kb.health_status === 'healthy').length,
        total_kbs: systemStatus.knowledge_bases.length,
        overall_health: systemStatus.health_score >= 90 ? 'excellent' : 
                       systemStatus.health_score >= 70 ? 'good' : 
                       systemStatus.health_score >= 50 ? 'fair' : 'poor'
      }
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      alerts: [{
        severity: 'error',
        message: 'Failed to retrieve system health status',
        timestamp: Date.now()
      }]
    });
  }
});

// Set up the MCP endpoint
app.post('/mcp', async (req: Request, res: Response) => {
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

// Query endpoint to check what's in the database
app.get('/api/query/:kb_id', async (req: Request, res: Response) => {
  try {
    const { kb_id } = req.params;
    const { cypher = 'MATCH (n) WHERE n.kb_id = $kb_id RETURN n LIMIT 10' } = req.query;
    
    const session = getDriver().session({ database: 'neo4j' });
    
    try {
      const result = await session.run(cypher as string, { kb_id });
      const data = result.records.map((record: any) => record.toObject());
      
      res.json({ 
        success: true, 
        kb_id,
        query: cypher,
        results: data,
        count: data.length
      });
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.listen(config.PORT, () => {
  console.log(`🚀 Knowledge Graph Brain Orchestrator running on http://localhost:${config.PORT}`);
  if (config.DEMO_MODE) {
    console.log('🎭 Running in DEMO MODE - using mock data where credentials are missing');
  }
});