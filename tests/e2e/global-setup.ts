import { chromium, FullConfig } from '@playwright/test';
import neo4j from 'neo4j-driver';
import axios from 'axios';

/**
 * Global Setup for Knowledge Graph Brain E2E Tests
 * 
 * Ensures all services are running and test environment is prepared:
 * - Validates Neo4j connectivity and creates test database
 * - Confirms orchestrator service health
 * - Sets up test knowledge bases with known data
 * - Validates connector endpoints
 */

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up Knowledge Graph Brain test environment...');

  // Test environment configuration
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3100';
  const orchestratorURL = 'http://localhost:3000';
  const neo4jURI = process.env.NEO4J_URI || 'bolt://localhost:7687';
  const neo4jUser = process.env.NEO4J_USER || 'neo4j';
  const neo4jPassword = process.env.NEO4J_PASSWORD || 'password';

  try {
    // 1. Validate Neo4j Connection
    console.log('📊 Testing Neo4j connection...');
    const driver = neo4j.driver(neo4jURI, neo4j.auth.basic(neo4jUser, neo4jPassword));
    const session = driver.session({ database: 'graphbrain' });
    
    try {
      await session.run('MATCH (n) RETURN count(n) as count LIMIT 1');
      console.log('✅ Neo4j connection successful');
    } finally {
      await session.close();
      await driver.close();
    }

    // 2. Validate Orchestrator Service
    console.log('🎛️ Testing orchestrator service...');
    const healthResponse = await axios.get(`${orchestratorURL}/api/status`, { timeout: 10000 });
    if (healthResponse.status !== 200) {
      throw new Error(`Orchestrator health check failed: ${healthResponse.status}`);
    }
    console.log('✅ Orchestrator service healthy');

    // 3. Validate Web UI Accessibility
    console.log('🖥️ Testing web UI accessibility...');
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    try {
      await page.goto(baseURL, { waitUntil: 'networkidle' });
      // Wait for React to load
      await page.waitForSelector('h1', { timeout: 15000 });
      console.log('✅ Web UI accessible and loading');
    } finally {
      await page.close();
      await browser.close();
    }

    // 4. Setup Test Knowledge Bases
    console.log('🧠 Setting up test knowledge bases...');
    await setupTestKnowledgeBases(orchestratorURL);

    // 5. Validate Connector Services
    console.log('🔌 Testing connector services...');
    await validateConnectors();

    console.log('🎉 Test environment setup complete!');

  } catch (error) {
    console.error('❌ Test environment setup failed:', error);
    throw error;
  }
}

async function setupTestKnowledgeBases(orchestratorURL: string) {
  // Test KB 1: Simple demo knowledge base
  const demoKB = {
    kb_id: 'playwright-test-demo',
    embedding: {
      provider: 'ollama:mxbai-embed-large'
    },
    schema: {
      nodes: [
        {
          label: 'Document',
          key: 'id',
          props: ['id', 'title', 'content', 'created_date']
        },
        {
          label: 'Person',
          key: 'email',
          props: ['name', 'email', 'role']
        }
      ],
      relationships: [
        {
          type: 'AUTHORED_BY',
          from: 'Document',
          to: 'Person'
        }
      ]
    }
  };

  try {
    await axios.post(`${orchestratorURL}/api/register-schema`, demoKB, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    });
    console.log('✅ Test knowledge base registered');
  } catch (error) {
    console.warn('⚠️ Test KB registration failed (may already exist):', (error as Error).message);
  }

  // Test KB 2: Performance testing knowledge base (larger dataset)
  const perfKB = {
    kb_id: 'playwright-test-performance',
    embedding: {
      provider: 'ollama:mxbai-embed-large',
      chunking: {
        strategy: 'paragraph',
        max_tokens: 500
      }
    },
    schema: {
      nodes: [
        {
          label: 'Product',
          key: 'id',
          props: ['id', 'name', 'description', 'price', 'category']
        },
        {
          label: 'Category',
          key: 'name',
          props: ['name', 'description']
        }
      ],
      relationships: [
        {
          type: 'IN_CATEGORY',
          from: 'Product',
          to: 'Category'
        }
      ]
    }
  };

  try {
    await axios.post(`${orchestratorURL}/api/register-schema`, perfKB, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    });
    console.log('✅ Performance test knowledge base registered');
  } catch (error) {
    console.warn('⚠️ Performance KB registration failed (may already exist):', (error as Error).message);
  }
}

async function validateConnectors() {
  const connectors = [
    { name: 'GitHub', port: 3001 },
    { name: 'Slack', port: 3003 },
    { name: 'Confluence', port: 3004 }
  ];

  for (const connector of connectors) {
    try {
      const response = await axios.get(`http://localhost:${connector.port}/health`, { 
        timeout: 5000 
      });
      console.log(`✅ ${connector.name} connector available`);
    } catch (error) {
      console.log(`ℹ️ ${connector.name} connector not running (optional for tests)`);
    }
  }
}

export default globalSetup;