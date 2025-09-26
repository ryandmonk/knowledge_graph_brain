import { test, expect, Page } from '@playwright/test';

/**
 * Core User Workflows - End-to-End Testing
 * 
 * Tests the complete user journey through Knowledge Graph Brain:
 * 1. Initial setup and system health validation
 * 2. Knowledge base creation and schema registration
 * 3. Data source configuration and ingestion
 * 4. Query and search functionality
 * 5. Results visualization and interaction
 */

test.describe('Core User Workflows', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/ui');
    
    // Wait for the application to load
    await page.waitForSelector('h1:has-text("Knowledge Graph Brain")', { timeout: 15000 });
  });

  test('Complete Setup Wizard Flow', async ({ page }) => {
    test.slow(); // Mark as slow test (3x timeout)
    
    // Step 1: System Health Check
    await test.step('Validate system health dashboard', async () => {
      // Check if health indicators are present
      await expect(page.locator('[data-testid="health-check-neo4j"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="health-check-orchestrator"]')).toBeVisible();
      await expect(page.locator('[data-testid="health-check-ollama"]')).toBeVisible();
      
      // Wait for health checks to complete (green status)
      await page.waitForFunction(() => {
        const healthIndicators = document.querySelectorAll('[data-testid*="health-check"]');
        return Array.from(healthIndicators).every(indicator => 
          indicator.classList.contains('text-green-600') || 
          indicator.querySelector('.text-green-600')
        );
      }, { timeout: 30000 });
    });

    // Step 2: Knowledge Base Creation
    await test.step('Create new knowledge base', async () => {
      await page.click('[data-testid="create-kb-button"]');
      
      // Fill out knowledge base form
      await page.fill('[data-testid="kb-id-input"]', 'test-kb-' + Date.now());
      await page.fill('[data-testid="kb-description-input"]', 'Test knowledge base for E2E testing');
      
      // Select embedding provider
      await page.selectOption('[data-testid="embedding-provider-select"]', 'ollama:mxbai-embed-large');
      
      // Submit form
      await page.click('[data-testid="create-kb-submit"]');
      
      // Wait for success message
      await expect(page.locator('.toast-success')).toBeVisible({ timeout: 15000 });
    });

    // Step 3: Schema Configuration
    await test.step('Configure knowledge graph schema', async () => {
      // Navigate to schema configuration
      await page.click('[data-testid="configure-schema-button"]');
      
      // Wait for schema editor to load
      await page.waitForSelector('[data-testid="schema-editor"]');
      
      // Use pre-built schema template
      await page.click('[data-testid="use-template-button"]');
      await page.selectOption('[data-testid="template-select"]', 'confluence-simple');
      
      // Validate schema in editor
      await expect(page.locator('[data-testid="schema-editor"] textarea')).toContainText('Document');
      await expect(page.locator('[data-testid="schema-editor"] textarea')).toContainText('Person');
      
      // Save schema
      await page.click('[data-testid="save-schema-button"]');
      await expect(page.locator('.toast-success')).toBeVisible();
    });

    // Step 4: Data Source Setup
    await test.step('Add and configure data source', async () => {
      // Navigate to data sources
      await page.click('[data-testid="manage-sources-button"]');
      
      // Add new source
      await page.click('[data-testid="add-source-button"]');
      
      // Select connector type
      await page.selectOption('[data-testid="connector-type-select"]', 'confluence');
      
      // Configure source settings (demo mode)
      await page.fill('[data-testid="source-id-input"]', 'test-confluence-source');
      await page.check('[data-testid="demo-mode-checkbox"]');
      
      // Test connection
      await page.click('[data-testid="test-connection-button"]');
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText('Connected', { timeout: 10000 });
      
      // Save source
      await page.click('[data-testid="save-source-button"]');
      await expect(page.locator('.toast-success')).toBeVisible();
    });

    // Step 5: Data Ingestion
    await test.step('Trigger data ingestion', async () => {
      // Start ingestion process
      await page.click('[data-testid="start-ingestion-button"]');
      
      // Monitor ingestion progress
      await expect(page.locator('[data-testid="ingestion-status"]')).toHaveText('Running', { timeout: 5000 });
      
      // Wait for completion (or reasonable progress)
      await page.waitForFunction(() => {
        const statusElement = document.querySelector('[data-testid="ingestion-status"]');
        return statusElement && (
          statusElement.textContent === 'Completed' || 
          statusElement.textContent === 'Success'
        );
      }, { timeout: 60000 });
      
      // Verify some data was ingested
      await expect(page.locator('[data-testid="ingested-documents-count"]')).not.toHaveText('0');
    });
  });

  test('Search and Query Functionality', async ({ page }) => {
    // Assume we have a knowledge base set up (from previous test or test data)
    
    // Step 1: Navigate to search interface
    await test.step('Navigate to search interface', async () => {
      await page.click('[data-testid="search-tab"]');
      await expect(page.locator('[data-testid="search-interface"]')).toBeVisible();
    });

    // Step 2: Semantic Search
    await test.step('Perform semantic search', async () => {
      const searchQuery = 'knowledge graphs and tutorials';
      
      await page.fill('[data-testid="semantic-search-input"]', searchQuery);
      await page.click('[data-testid="semantic-search-button"]');
      
      // Wait for results
      await page.waitForSelector('[data-testid="search-results"]', { timeout: 15000 });
      
      // Verify results contain relevant information
      const resultsCount = await page.locator('[data-testid="search-result-item"]').count();
      expect(resultsCount).toBeGreaterThan(0);
      
      // Check that results are properly formatted
      await expect(page.locator('[data-testid="search-result-item"]').first()).toContainText('Document');
    });

    // Step 3: Graph Query
    await test.step('Execute graph query', async () => {
      await page.click('[data-testid="graph-query-tab"]');
      
      const cypherQuery = 'MATCH (d:Document)-[r:AUTHORED_BY]->(p:Person) RETURN d.title, p.name LIMIT 5';
      
      await page.fill('[data-testid="cypher-query-input"]', cypherQuery);
      await page.click('[data-testid="execute-query-button"]');
      
      // Wait for query results
      await page.waitForSelector('[data-testid="query-results"]', { timeout: 10000 });
      
      // Verify results table is populated
      const rowsCount = await page.locator('[data-testid="query-result-row"]').count();
      expect(rowsCount).toBeGreaterThan(0);
    });

    // Step 4: GraphRAG Natural Language Query
    await test.step('Test GraphRAG natural language query', async () => {
      await page.click('[data-testid="graphrag-tab"]');
      
      const naturalQuery = 'What documents are available and who wrote them?';
      
      await page.fill('[data-testid="graphrag-query-input"]', naturalQuery);
      await page.click('[data-testid="ask-graphrag-button"]');
      
      // Wait for AI response
      await page.waitForSelector('[data-testid="graphrag-response"]', { timeout: 30000 });
      
      // Verify response contains structured information
      await expect(page.locator('[data-testid="graphrag-response"]')).not.toBeEmpty();
      
      // Check for citations and sources
      await expect(page.locator('[data-testid="graphrag-citations"]')).toBeVisible();
    });
  });

  test('3D Graph Visualization Interaction', async ({ page }) => {
    // Navigate to visualization
    await test.step('Load 3D graph visualization', async () => {
      await page.click('[data-testid="visualization-tab"]');
      
      // Wait for 3D visualization to load
      await page.waitForSelector('[data-testid="graph-3d-container"]', { timeout: 20000 });
      
      // Wait for graph to render (WebGL initialization)
      await page.waitForFunction(() => {
        const container = document.querySelector('[data-testid="graph-3d-container"]');
        return container && container.querySelector('canvas');
      }, { timeout: 15000 });
    });

    // Test graph interactions
    await test.step('Test graph navigation controls', async () => {
      const graphContainer = page.locator('[data-testid="graph-3d-container"]');
      
      // Test zoom controls
      await page.click('[data-testid="zoom-in-button"]');
      await page.click('[data-testid="zoom-out-button"]');
      
      // Test reset view
      await page.click('[data-testid="reset-view-button"]');
      
      // Test node filtering
      await page.selectOption('[data-testid="node-filter-select"]', 'Document');
      await page.waitForTimeout(1000); // Wait for filter to apply
      
      // Reset filter
      await page.selectOption('[data-testid="node-filter-select"]', 'All');
    });

    // Test node interaction
    await test.step('Test node selection and details', async () => {
      // This would require more sophisticated interaction with the 3D canvas
      // For now, test the UI controls around the visualization
      
      await expect(page.locator('[data-testid="graph-controls"]')).toBeVisible();
      await expect(page.locator('[data-testid="node-details-panel"]')).toBeVisible();
    });
  });

  test('Real-time Monitoring Dashboard', async ({ page }) => {
    // Navigate to monitoring
    await test.step('Load monitoring dashboard', async () => {
      await page.click('[data-testid="monitoring-tab"]');
      await expect(page.locator('[data-testid="monitoring-dashboard"]')).toBeVisible();
    });

    // Test WebSocket connectivity
    await test.step('Validate real-time updates', async () => {
      // Check that WebSocket connection is established
      await page.waitForFunction(() => {
        return window.navigator.onLine && 
               document.querySelector('[data-testid="websocket-status"]')?.textContent === 'Connected';
      }, { timeout: 10000 });
      
      // Verify monitoring metrics are updating
      await expect(page.locator('[data-testid="system-metrics"]')).toBeVisible();
      await expect(page.locator('[data-testid="ingestion-metrics"]')).toBeVisible();
    });

    // Test health indicators
    await test.step('Check service health indicators', async () => {
      const healthChecks = [
        'neo4j-health',
        'orchestrator-health', 
        'ollama-health'
      ];
      
      for (const healthCheck of healthChecks) {
        await expect(page.locator(`[data-testid="${healthCheck}"]`)).toBeVisible();
      }
    });
  });

  test('Error Handling and Recovery', async ({ page }) => {
    // Test various error scenarios and recovery mechanisms
    
    await test.step('Handle invalid search queries', async () => {
      await page.click('[data-testid="search-tab"]');
      
      // Try search with empty query
      await page.click('[data-testid="semantic-search-button"]');
      await expect(page.locator('[data-testid="search-error"]')).toContainText('required');
      
      // Try invalid Cypher query
      await page.click('[data-testid="graph-query-tab"]');
      await page.fill('[data-testid="cypher-query-input"]', 'INVALID CYPHER SYNTAX');
      await page.click('[data-testid="execute-query-button"]');
      
      await expect(page.locator('[data-testid="query-error"]')).toBeVisible({ timeout: 5000 });
    });

    await test.step('Handle network connectivity issues', async () => {
      // Simulate offline scenario (if supported by test environment)
      // This would require more sophisticated setup with proxy/network interception
      
      // For now, test the UI error states
      await expect(page.locator('[data-testid="error-boundary"]')).not.toBeVisible();
    });
  });
});

// Test helper functions
async function waitForHealthChecks(page: Page, timeout = 30000) {
  await page.waitForFunction(() => {
    const healthIndicators = document.querySelectorAll('[data-testid*="health-check"]');
    return Array.from(healthIndicators).every(indicator => 
      indicator.classList.contains('text-green-600') || 
      indicator.querySelector('.text-green-600')
    );
  }, { timeout });
}