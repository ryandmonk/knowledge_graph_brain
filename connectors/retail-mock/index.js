const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8081;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Mock data for retail products
const mockProducts = [
  {
    id: 'product-1',
    name: 'Wireless Headphones',
    price: 99.99,
    category: 'Electronics',
    description: 'High-quality wireless headphones with noise cancellation',
    sku: 'WH-001',
    stock: 50,
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'product-2',
    name: 'Running Shoes',
    price: 79.99,
    category: 'Sports',
    description: 'Comfortable running shoes for daily exercise',
    sku: 'RS-001',
    stock: 30,
    created_at: '2025-01-01T06:00:00Z'
  },
  {
    id: 'product-3',
    name: 'Coffee Maker',
    price: 149.99,
    category: 'Kitchen',
    description: 'Programmable coffee maker with thermal carafe',
    sku: 'CM-001',
    stock: 20,
    created_at: '2025-01-01T12:00:00Z'
  },
  {
    id: 'product-4',
    name: 'Desk Chair',
    price: 199.99,
    category: 'Furniture',
    description: 'Ergonomic office chair with lumbar support',
    sku: 'DC-001',
    stock: 15,
    created_at: '2025-01-01T18:00:00Z'
  },
  {
    id: 'product-5',
    name: 'Smartphone Case',
    price: 24.99,
    category: 'Electronics',
    description: 'Protective case for smartphones',
    sku: 'SC-001',
    stock: 100,
    created_at: '2025-01-02T00:00:00Z'
  }
];

// Mock customer data
const mockCustomers = [
  {
    id: 'customer-1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    segment: 'premium',
    created_at: '2024-12-01T00:00:00Z'
  },
  {
    id: 'customer-2', 
    name: 'Bob Smith',
    email: 'bob@example.com',
    segment: 'standard',
    created_at: '2024-12-05T00:00:00Z'
  },
  {
    id: 'customer-3',
    name: 'Carol Davis',
    email: 'carol@example.com',
    segment: 'basic',
    created_at: '2024-12-10T00:00:00Z'
  }
];

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'retail-mock-connector',
    timestamp: new Date().toISOString()
  });
});

// List available data sources
app.get('/sources', (req, res) => {
  res.json([
    {
      id: 'products',
      name: 'Product Catalog',
      description: 'Mock retail product data',
      schema: {
        id: 'string',
        name: 'string',
        price: 'number',
        category: 'string',
        description: 'string',
        sku: 'string',
        stock: 'number',
        created_at: 'datetime'
      }
    },
    {
      id: 'customers',
      name: 'Customer Database',
      description: 'Mock customer data',
      schema: {
        id: 'string',
        name: 'string', 
        email: 'string',
        segment: 'string',
        created_at: 'datetime'
      }
    }
  ]);
});

// Get data from a specific source
app.get('/data/:sourceId', (req, res) => {
  const { sourceId } = req.params;
  const { limit = 100, cursor, since } = req.query;
  
  let data = [];
  
  try {
    if (sourceId === 'products') {
      data = mockProducts;
    } else if (sourceId === 'customers') {
      data = mockCustomers;
    } else {
      return res.status(404).json({
        error: 'Source not found',
        available_sources: ['products', 'customers']
      });
    }
    
    // Filter by 'since' parameter if provided
    if (since) {
      const sinceDate = new Date(since);
      data = data.filter(item => new Date(item.created_at) >= sinceDate);
    }
    
    // Apply pagination
    const startIndex = cursor ? parseInt(cursor) : 0;
    const endIndex = startIndex + parseInt(limit);
    const paginatedData = data.slice(startIndex, endIndex);
    
    res.json({
      data: paginatedData,
      next_cursor: endIndex < data.length ? endIndex.toString() : null,
      has_more: endIndex < data.length,
      total_available: data.length
    });
    
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`🛍️  Retail Mock Connector running on port ${port}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   GET  http://localhost:${port}/health`);
  console.log(`   GET  http://localhost:${port}/sources`);
  console.log(`   GET  http://localhost:${port}/data/products`);
  console.log(`   GET  http://localhost:${port}/data/customers`);
});