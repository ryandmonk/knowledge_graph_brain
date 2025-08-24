const express = require('express');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');

// Initialize the MCP server for the connector
const server = new McpServer({
  name: 'Confluence Connector',
  version: '1.0.0'
});

// Mock data for Confluence pages
const mockPages = [
  {
    id: 'page-1',
    title: 'Getting Started with Knowledge Graphs',
    _links: {
      webui: '/pages/viewpage.action?pageId=page-1'
    },
    space: {
      key: 'KG'
    },
    history: {
      createdDate: '2025-01-01T00:00:00Z',
      lastUpdated: {
        when: '2025-01-02T00:00:00Z'
      },
      createdBy: {
        email: 'author1@example.com',
        displayName: 'Author One'
      }
    },
    body: {
      storage: {
        value: '<h1>Getting Started</h1><p>This is a guide to getting started with knowledge graphs.</p>'
      }
    },
    labels: [
      { name: 'knowledge-graph' },
      { name: 'tutorial' }
    ]
  },
  {
    id: 'page-2',
    title: 'Advanced Graph Algorithms',
    _links: {
      webui: '/pages/viewpage.action?pageId=page-2'
    },
    space: {
      key: 'KG'
    },
    history: {
      createdDate: '2025-01-03T00:00:00Z',
      lastUpdated: {
        when: '2025-01-04T00:00:00Z'
      },
      createdBy: {
        email: 'author2@example.com',
        displayName: 'Author Two'
      }
    },
    body: {
      storage: {
        value: '<h1>Advanced Algorithms</h1><p>This page covers advanced graph algorithms.</p>'
      }
    },
    labels: [
      { name: 'algorithms' },
      { name: 'advanced' }
    ]
  }
];

// Implement the pull capability as a tool
server.registerTool('pull', 'Pull documents from Confluence', {
  since: 'string'  // Optional parameter
}, async ({ since }) => {
  // In a real implementation, you would filter pages based on the 'since' parameter
  // For now, we're just returning all mock pages
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        documents: mockPages,
        next_since: new Date().toISOString()
      })
    }]
  };
});

// Create an Express app to serve the MCP server
const app = express();
const port = process.env.PORT || 3001;

// Middleware to parse JSON
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'confluence-connector' });
});

// Simple pull endpoint for testing
app.get('/pull', (req, res) => {
  // Transform mock pages to the expected format
  const transformedPages = mockPages.map(page => ({
    id: page.id,
    title: page.title,
    content: page.body.storage.value,
    created_date: page.history.createdDate,
    author: {
      name: page.history.createdBy.displayName,
      email: page.history.createdBy.email,
      role: 'author'
    },
    space: page.space.key,
    url: page._links.webui,
    labels: page.labels.map(l => l.name)
  }));
  
  console.log(`📄 Serving ${transformedPages.length} pages via /pull endpoint`);
  res.json(transformedPages);
});

// Set up the MCP endpoint
app.post('/mcp', async (req, res) => {
  try {
    // For simplicity, we're creating a new transport for each request
    // In a production environment, you'd want to manage transports more carefully
    const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
    const { randomUUID } = require('crypto');
    
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

// Start the server
app.listen(port, () => {
  console.log(`Confluence connector listening on port ${port}`);
});