// Update the main index.ts file to integrate all components
import express, { Request, Response } from 'express';
import { server } from './capabilities';
import { initDriver, setupKB, mergeNodesAndRels, getDriver } from './ingest';
import { parseSchema, applyMapping } from './dsl';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'crypto';
import { syncStatusHandler, runsHandler, getSystemStatus } from './status/index';
import axios from 'axios';

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
    
    if (!kb_id || !schema_yaml) {
      return res.status(400).json({ error: 'Missing kb_id or schema_yaml' });
    }
    
    // Parse and validate the schema
    const schema = parseSchema(schema_yaml);
    
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
    
    // For now, we'll assume the schema is already registered and retrieve it
    // In a full implementation, we'd store and retrieve the schema from Neo4j
    // For the demo, let's use the retail schema directly
    const retailSchema = parseSchema(`# Retail Schema Example
kb_id: retail-demo
embedding:
  provider: "ollama:mxbai-embed-large"
  chunking:
    strategy: "by_fields"
    fields: ["description", "attributes"]
schema:
  nodes:
    - label: Product
      key: sku
      props: [sku, name, description, brand, category, price, currency]
    - label: Order
      key: order_id
      props: [order_id, order_date, total, currency]
    - label: Customer
      key: email
      props: [email, name, segment]
  relationships:
    - type: CONTAINS
      from: Order
      to: Product
      props: [qty, unit_price]
    - type: PURCHASED_BY
      from: Order
      to: Customer
mappings:
  sources:
    - source_id: "shopify"
      document_type: "order"
      extract:
        node: Order
        assign:
          order_id: "$.id"
          order_date: "$.created_at"
          total: "$.total_price"
          currency: "$.currency"
      edges:
        - type: CONTAINS
          from: { node: Order, key: "$.id" }
          to: 
            node: Product
            key: "$.line_items[*].sku"
            props:
              qty: "$.line_items[*].quantity"
              unit_price: "$.line_items[*].price"
        - type: PURCHASED_BY
          from: { node: Order, key: "$.id" }
          to: { node: Customer, key: "$.customer.email" }`);
    
    // Find the mapping for this source
    const mapping = retailSchema.mappings.sources.find(s => s.source_id === source_id);
    if (!mapping) {
      return res.status(400).json({ error: `No mapping found for source_id: ${source_id}` });
    }
    
    // Fetch data from the connector (assuming it's running on localhost:8081)
    const connectorUrl = `http://localhost:8081/data/products`; // For now, just products
    const response = await axios.get(connectorUrl);
    const documents = response.data.data;
    
    const run_id = randomUUID();
    let totalNodes = 0;
    let totalRels = 0;
    
    // Process each document
    for (const doc of documents) {
      // Transform the product data to match our order schema structure
      const mockOrder = {
        id: `order-${doc.id}`,
        created_at: doc.created_at,
        total_price: doc.price,
        currency: 'USD',
        line_items: [{
          sku: doc.sku,
          quantity: 1,
          price: doc.price
        }],
        customer: {
          email: `customer-${doc.id}@example.com`
        }
      };
      
      // Apply the mapping to extract nodes and relationships
      const { nodes, relationships } = applyMapping(mockOrder, mapping, retailSchema);
      
      // Create additional nodes for Products and Customers that will be referenced in relationships
      const productNode = {
        label: 'Product',
        properties: {
          sku: doc.sku,
          name: doc.name,
          description: doc.description,
          brand: doc.brand || 'Unknown',
          category: doc.category,
          price: doc.price,
          currency: 'USD'
        }
      };
      
      const customerNode = {
        label: 'Customer',
        properties: {
          email: `customer-${doc.id}@example.com`,
          name: `Customer ${doc.id}`,
          segment: 'retail'
        }
      };
      
      // Add the additional nodes
      nodes.push(productNode);
      nodes.push(customerNode);
      
      // Convert to the format expected by mergeNodesAndRels
      const formattedNodes = nodes.map(node => {
        let key;
        if (node.label === 'Order') {
          key = node.properties.order_id;
        } else if (node.label === 'Product') {
          key = node.properties.sku;
        } else if (node.label === 'Customer') {
          key = node.properties.email;
        } else {
          key = node.properties.id || Object.values(node.properties)[0];
        }
        
        console.log(`Formatting node: ${node.label}, key: ${key}, properties:`, node.properties);
        
        return {
          label: node.label,
          key: key,
          properties: node.properties
        };
      });
      
      const formattedRels = relationships.map(rel => {
        console.log(`Formatting relationship: ${rel.type}, from: ${rel.from.label}(${rel.from.key}) -> to: ${rel.to.label}(${rel.to.key})`);
        return {
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
        };
      });
      
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

// Query endpoint to check what's in the database
app.get('/api/query/:kb_id', async (req: Request, res: Response) => {
  try {
    const { kb_id } = req.params;
    const { cypher = 'MATCH (n) WHERE n.kb_id = $kb_id RETURN n LIMIT 10' } = req.query;
    
    const session = getDriver().session({ database: 'graphbrain' });
    
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

app.listen(port, () => {
  console.log(`Knowledge Graph Orchestrator MCP server is running on port ${port}`);
});