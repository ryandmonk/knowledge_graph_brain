// Update the main index.ts file to integrate all components
import express, { Request, Response } from 'express';
import { server } from './capabilities';
import { initDriver } from './ingest';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'crypto';
import { syncStatusHandler, runsHandler, getSystemStatus } from './status/index.js';

// Initialize Neo4j driver
initDriver();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'mcp-orchestrator' });
});

// Simple REST endpoints for testing
app.post('/api/register-schema', async (req: Request, res: Response) => {
  try {
    const { kb_id, schema_yaml } = req.body;
    // Call the register_schema tool directly (simplified for testing)
    res.json({ 
      success: true, 
      message: 'Schema registration endpoint available',
      kb_id: kb_id
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/api/ingest', async (req: Request, res: Response) => {
  try {
    const { kb_id, source_id } = req.body;
    res.json({ 
      success: true, 
      message: 'Ingest endpoint available',
      kb_id: kb_id,
      source_id: source_id
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/api/semantic-search', async (req: Request, res: Response) => {
  try {
    const { kb_id, text, top_k = 5 } = req.body;
    
    // Mock semantic search results for testing
    const mockResults = [
      {
        node_id: 'doc-1',
        score: 0.87,
        content: {
          title: 'Getting Started with Knowledge Graphs',
          type: 'document',
          author: 'John Doe',
          kb_id: kb_id,
          content: 'Knowledge graphs are powerful data structures that represent information as interconnected entities and relationships...'
        }
      },
      {
        node_id: 'doc-2', 
        score: 0.78,
        content: {
          title: 'Graph RAG Tutorial',
          type: 'document', 
          author: 'Jane Smith',
          kb_id: kb_id,
          content: 'Retrieval-Augmented Generation with knowledge graphs combines the power of semantic search with structured data...'
        }
      }
    ];
    
    res.json({
      found: mockResults.length,
      results: mockResults.slice(0, top_k),
      query: text
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/api/search-graph', async (req: Request, res: Response) => {
  try {
    const { kb_id, cypher } = req.body;
    
    // Mock graph query results
    const mockRows = [
      {
        title: 'Getting Started with Knowledge Graphs',
        author: 'John Doe',
        email: 'john@example.com',
        created: '2025-01-01T00:00:00Z'
      },
      {
        title: 'Graph RAG Tutorial',
        author: 'Jane Smith', 
        email: 'jane@example.com',
        created: '2025-01-02T00:00:00Z'
      }
    ];
    
    res.json({
      rows: mockRows,
      query: cypher,
      kb_id: kb_id
    });
  } catch (error) {
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

app.listen(port, () => {
  console.log(`Knowledge Graph Orchestrator MCP server is running on port ${port}`);
});