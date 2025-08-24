const express = require('express');
const { Server } = require('@modelcontextprotocol/sdk');

// Initialize the MCP server for the connector
const server = new Server({
  name: 'Retail Mock Connector',
  version: '1.0.0'
  });

// Mock data for retail orders
const mockOrders = [
  {
    id: 'order-1',
    created_at: '2025-01-01T00:00:00Z',
    total_price: '100.00',
    currency: 'USD',
    customer: {
      email: 'customer1@example.com',
      name: 'Customer One'
    },
    line_items: [
      {
        sku: 'product-1',
        quantity: 1,
        price: '50.00'
      },
      {
        sku: 'product-2',
        quantity: 2,
        price: '25.00'
      }
    ]
  },
  {
    id: 'order-2',
    created_at: '2025-01-02T00:00:00Z',
    total_price: '200.00',
    currency: 'USD',
    customer: {
      email: 'customer2@example.com',
      name: 'Customer Two'
    },
    line_items: [
      {
        sku: 'product-3',
        quantity: 1,
        price: '200.00'
      }
    ]
  }
];

// Implement the pull capability
server.setRequestHandler('pull', async (request) => {
  const { since } = request.params || {};
  
  // In a real implementation, you would filter orders based on the 'since' parameter
  // For now, we're just returning all mock orders
  
  return {
    documents: mockOrders,
    next_since: new Date().toISOString()
  };
});

// Create an Express app to serve the MCP server
const app = express();
const port = process.env.PORT || 8081;

// Mount the MCP server middleware
app.use(server.router);

// Start the server
app.listen(port, () => {
  console.log(`Retail mock connector listening on port ${port}`);
});