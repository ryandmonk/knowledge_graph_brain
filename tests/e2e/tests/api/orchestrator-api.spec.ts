import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * API Integration Testing
 * 
 * Tests the Knowledge Graph Brain REST API endpoints independently
 * and in integration with the full system workflow:
 * - Orchestrator API endpoints
 * - MCP tool functionality  
 * - Connector API interactions
 * - Authentication and authorization
 */

test.describe('API Integration Tests', () => {
  let apiContext: APIRequestContext;
  const baseURL = 'http://localhost:3000/api';
  
  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test.describe('System Health and Status', () => {
    
    test('GET /status - System health check', async () => {
      const response = await apiContext.get('/status');
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('services');
      expect(data.services).toHaveProperty('neo4j');
      expect(data.services).toHaveProperty('ollama');
    });

    test('GET /health - Detailed health metrics', async () => {
      const response = await apiContext.get('/health');
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('memory');
      expect(data).toHaveProperty('services');
    });

  });

  test.describe('Knowledge Base Management', () => {
    
    const testKBId = `api-test-kb-${Date.now()}`;
    
    test('POST /register-schema - Register new knowledge base', async () => {
      const schema = {
        kb_id: testKBId,
        embedding: {
          provider: 'ollama:mxbai-embed-large'
        },
        schema: {
          nodes: [
            {
              label: 'Document',
              key: 'id',
              props: ['id', 'title', 'content']
            }
          ],
          relationships: []
        }
      };

      const response = await apiContext.post('/register-schema', {
        data: schema
      });
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('message');
      expect(data.message).toContain('registered');
    });

    test('GET /knowledge-bases - List knowledge bases', async () => {
      const response = await apiContext.get('/knowledge-bases');
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data.knowledge_bases)).toBeTruthy();
      
      // Our test KB should be in the list
      const testKB = data.knowledge_bases.find((kb: any) => kb.kb_id === testKBId);
      expect(testKB).toBeDefined();
    });

    test('GET /kb-status - Knowledge base status', async () => {
      const response = await apiContext.get('/kb-status', {
        params: { kb_id: testKBId }
      });
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('kb_id', testKBId);
      expect(data).toHaveProperty('status');
    });

  });

  test.describe('Data Source Management', () => {
    
    const testKBId = `api-test-sources-${Date.now()}`;
    const testSourceId = 'test-confluence-api';
    
    test.beforeAll(async () => {
      // Register a test KB for source testing
      await apiContext.post('/register-schema', {
        data: {
          kb_id: testKBId,
          embedding: { provider: 'ollama:mxbai-embed-large' },
          schema: { nodes: [], relationships: [] }
        }
      });
    });

    test('POST /add-source - Add data source', async () => {
      const sourceConfig = {
        kb_id: testKBId,
        source_id: testSourceId,
        connector_url: 'http://localhost:3001',
        document_type: 'confluence_page',
        mapping: {
          'title': '$.title',
          'content': '$.content',
          'author_email': '$.author.email'
        }
      };

      const response = await apiContext.post('/add-source', {
        data: sourceConfig
      });
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('message');
      expect(data.message).toContain('added');
    });

    test('GET /sources - List data sources', async () => {
      const response = await apiContext.get('/sources', {
        params: { kb_id: testKBId }
      });
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data.sources)).toBeTruthy();
      
      const testSource = data.sources.find((src: any) => src.source_id === testSourceId);
      expect(testSource).toBeDefined();
    });

  });

  test.describe('Data Ingestion', () => {
    
    const testKBId = 'api-test-ingestion';
    
    test('POST /ingest - Trigger data ingestion', async () => {
      const response = await apiContext.post('/ingest', {
        data: { kb_id: testKBId }
      });
      
      // Should start ingestion successfully
      expect([200, 202]).toContain(response.status());
      
      const data = await response.json();
      expect(data).toHaveProperty('run_id');
      expect(data).toHaveProperty('status');
    });

    test('GET /sync-status - Check ingestion status', async () => {
      // First trigger an ingestion
      const ingestResponse = await apiContext.post('/ingest', {
        data: { kb_id: testKBId }
      });
      
      const ingestData = await ingestResponse.json();
      const runId = ingestData.run_id;
      
      // Check status
      const response = await apiContext.get('/sync-status', {
        params: { 
          kb_id: testKBId,
          run_id: runId 
        }
      });
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('progress');
    });

  });

  test.describe('Search and Query', () => {
    
    const testKBId = 'playwright-test-demo'; // Use pre-populated test KB
    
    test('POST /search-semantic - Semantic search', async () => {
      const searchRequest = {
        kb_id: testKBId,
        text: 'knowledge graphs tutorial',
        top_k: 5
      };

      const response = await apiContext.post('/search-semantic', {
        data: searchRequest
      });
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('results');
      expect(Array.isArray(data.results)).toBeTruthy();
    });

    test('POST /search-graph - Cypher query execution', async () => {
      const queryRequest = {
        kb_id: testKBId,
        cypher: 'MATCH (n) RETURN count(n) as total_nodes',
        params: {}
      };

      const response = await apiContext.post('/search-graph', {
        data: queryRequest
      });
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('results');
      expect(Array.isArray(data.results)).toBeTruthy();
    });

    test('POST /ask-knowledge-graph - GraphRAG natural language query', async () => {
      const askRequest = {
        kb_id: testKBId,
        question: 'What documents are available?',
        include_citations: true
      };

      const response = await apiContext.post('/ask-knowledge-graph', {
        data: askRequest
      });
      
      // This endpoint might take longer
      expect([200, 202]).toContain(response.status());
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('answer');
        expect(data).toHaveProperty('sources');
      }
    });

  });

  test.describe('MCP Tool Integration', () => {
    
    test('MCP server tool availability', async () => {
      // Test that MCP tools are accessible via the API
      const response = await apiContext.get('/mcp/tools');
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data.tools)).toBeTruthy();
      expect(data.tools.length).toBeGreaterThan(10); // Should have 16 tools
    });

    test('MCP tool execution via API', async () => {
      const toolRequest = {
        tool_name: 'list_knowledge_bases',
        arguments: {}
      };

      const response = await apiContext.post('/mcp/execute', {
        data: toolRequest
      });
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('result');
    });

  });

  test.describe('Error Handling', () => {
    
    test('Invalid knowledge base ID handling', async () => {
      const response = await apiContext.get('/kb-status', {
        params: { kb_id: 'nonexistent-kb' }
      });
      
      expect(response.status()).toBe(404);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('Invalid API endpoints return 404', async () => {
      const response = await apiContext.get('/nonexistent-endpoint');
      
      expect(response.status()).toBe(404);
    });

    test('Malformed request body handling', async () => {
      const response = await apiContext.post('/register-schema', {
        data: { invalid: 'schema' }
      });
      
      expect([400, 422]).toContain(response.status());
    });

  });

  test.describe('Performance and Rate Limiting', () => {
    
    test('Concurrent API requests handling', async () => {
      const promises = Array.from({ length: 10 }, () => 
        apiContext.get('/status')
      );
      
      const responses = await Promise.all(promises);
      
      // All requests should complete successfully
      responses.forEach(response => {
        expect(response.status()).toBe(200);
      });
    });

    test('Large payload handling', async () => {
      const largeSchema = {
        kb_id: `large-schema-test-${Date.now()}`,
        embedding: { provider: 'ollama:mxbai-embed-large' },
        schema: {
          nodes: Array.from({ length: 100 }, (_, i) => ({
            label: `TestNode${i}`,
            key: 'id',
            props: [`prop1_${i}`, `prop2_${i}`, `prop3_${i}`]
          })),
          relationships: []
        }
      };

      const response = await apiContext.post('/register-schema', {
        data: largeSchema
      });
      
      expect([200, 413]).toContain(response.status()); // 413 if too large
    });

  });

});