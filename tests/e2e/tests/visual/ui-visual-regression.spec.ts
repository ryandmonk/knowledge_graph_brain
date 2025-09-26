import { test, expect } from '@playwright/test';

/**
 * Visual Regression Testing
 * 
 * Captures screenshots of key UI components and pages to detect
 * unintended visual changes across releases:
 * - Setup wizard screens
 * - Dashboard and monitoring views  
 * - 3D graph visualizations
 * - Search result layouts
 * - Error states and messaging
 */

test.describe('Visual Regression Tests', () => {

  // Configure viewport for consistent screenshots
  test.use({ viewport: { width: 1920, height: 1080 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/ui');
    await page.waitForSelector('h1:has-text("Knowledge Graph Brain")', { timeout: 15000 });
  });

  test.describe('Setup Wizard Visual States', () => {

    test('Landing page and health dashboard', async ({ page }) => {
      // Wait for health checks to complete
      await page.waitForSelector('[data-testid="health-check-neo4j"]', { timeout: 15000 });
      
      // Take full page screenshot
      await expect(page).toHaveScreenshot('setup-wizard-landing.png', {
        fullPage: true,
        animations: 'disabled'
      });

      // Focus on health dashboard component
      const healthDashboard = page.locator('[data-testid="health-dashboard"]');
      await expect(healthDashboard).toHaveScreenshot('health-dashboard-component.png');
    });

    test('Knowledge base creation form', async ({ page }) => {
      await page.click('[data-testid="create-kb-button"]');
      
      // Wait for form to fully load
      await page.waitForSelector('[data-testid="kb-creation-form"]');
      
      // Screenshot of empty form
      await expect(page.locator('[data-testid="kb-creation-form"]')).toHaveScreenshot('kb-creation-form-empty.png');
      
      // Fill out form partially and capture
      await page.fill('[data-testid="kb-id-input"]', 'visual-test-kb');
      await page.fill('[data-testid="kb-description-input"]', 'Test knowledge base for visual testing');
      
      await expect(page.locator('[data-testid="kb-creation-form"]')).toHaveScreenshot('kb-creation-form-filled.png');
    });

    test('Schema configuration interface', async ({ page }) => {
      // Navigate to schema configuration
      await page.click('[data-testid="configure-schema-button"]');
      await page.waitForSelector('[data-testid="schema-editor"]');
      
      // Schema editor interface
      await expect(page.locator('[data-testid="schema-editor"]')).toHaveScreenshot('schema-editor-interface.png');
      
      // Template selection dropdown
      await page.click('[data-testid="use-template-button"]');
      await expect(page.locator('[data-testid="template-selection-modal"]')).toHaveScreenshot('schema-template-selection.png');
    });

  });

  test.describe('Search and Query Interfaces', () => {

    test('Search interface layouts', async ({ page }) => {
      await page.click('[data-testid="search-tab"]');
      
      // Main search interface
      await expect(page.locator('[data-testid="search-interface"]')).toHaveScreenshot('search-interface-main.png');
      
      // Semantic search tab
      await expect(page.locator('[data-testid="semantic-search-panel"]')).toHaveScreenshot('semantic-search-panel.png');
      
      // Graph query tab
      await page.click('[data-testid="graph-query-tab"]');
      await expect(page.locator('[data-testid="graph-query-panel"]')).toHaveScreenshot('graph-query-panel.png');
      
      // GraphRAG tab
      await page.click('[data-testid="graphrag-tab"]');
      await expect(page.locator('[data-testid="graphrag-panel"]')).toHaveScreenshot('graphrag-panel.png');
    });

    test('Search results layouts', async ({ page }) => {
      await page.click('[data-testid="search-tab"]');
      
      // Perform a semantic search to get results
      await page.fill('[data-testid="semantic-search-input"]', 'knowledge graphs');
      await page.click('[data-testid="semantic-search-button"]');
      
      // Wait for results and capture
      await page.waitForSelector('[data-testid="search-results"]', { timeout: 15000 });
      await expect(page.locator('[data-testid="search-results"]')).toHaveScreenshot('semantic-search-results.png');
      
      // Individual result card
      await expect(page.locator('[data-testid="search-result-item"]').first()).toHaveScreenshot('search-result-card.png');
    });

    test('Query execution and results', async ({ page }) => {
      await page.click('[data-testid="search-tab"]');
      await page.click('[data-testid="graph-query-tab"]');
      
      // Execute a simple query
      await page.fill('[data-testid="cypher-query-input"]', 'MATCH (n) RETURN count(n) as total');
      await page.click('[data-testid="execute-query-button"]');
      
      // Wait for results table
      await page.waitForSelector('[data-testid="query-results"]', { timeout: 10000 });
      await expect(page.locator('[data-testid="query-results"]')).toHaveScreenshot('cypher-query-results.png');
    });

  });

  test.describe('3D Graph Visualization', () => {

    test('3D graph loading states', async ({ page }) => {
      await page.click('[data-testid="visualization-tab"]');
      
      // Loading state
      await expect(page.locator('[data-testid="graph-loading-indicator"]')).toHaveScreenshot('graph-loading-state.png');
      
      // Wait for graph to fully load
      await page.waitForSelector('[data-testid="graph-3d-container"] canvas', { timeout: 20000 });
      
      // Full 3D visualization
      await expect(page.locator('[data-testid="graph-3d-container"]')).toHaveScreenshot('3d-graph-main-view.png');
    });

    test('3D graph controls and panels', async ({ page }) => {
      await page.click('[data-testid="visualization-tab"]');
      await page.waitForSelector('[data-testid="graph-3d-container"] canvas', { timeout: 20000 });
      
      // Control panel
      await expect(page.locator('[data-testid="graph-controls"]')).toHaveScreenshot('3d-graph-controls.png');
      
      // Node details panel
      await expect(page.locator('[data-testid="node-details-panel"]')).toHaveScreenshot('node-details-panel.png');
      
      // Filter controls
      await expect(page.locator('[data-testid="graph-filters"]')).toHaveScreenshot('graph-filter-controls.png');
    });

    test('3D graph different filter states', async ({ page }) => {
      await page.click('[data-testid="visualization-tab"]');
      await page.waitForSelector('[data-testid="graph-3d-container"] canvas', { timeout: 20000 });
      
      // All nodes view
      await expect(page.locator('[data-testid="graph-3d-container"]')).toHaveScreenshot('3d-graph-all-nodes.png');
      
      // Filter by Document nodes only
      await page.selectOption('[data-testid="node-filter-select"]', 'Document');
      await page.waitForTimeout(2000); // Wait for filter to apply
      await expect(page.locator('[data-testid="graph-3d-container"]')).toHaveScreenshot('3d-graph-documents-only.png');
      
      // Filter by Person nodes only
      await page.selectOption('[data-testid="node-filter-select"]', 'Person');
      await page.waitForTimeout(2000);
      await expect(page.locator('[data-testid="graph-3d-container"]')).toHaveScreenshot('3d-graph-persons-only.png');
    });

  });

  test.describe('Monitoring Dashboard', () => {

    test('System monitoring overview', async ({ page }) => {
      await page.click('[data-testid="monitoring-tab"]');
      
      // Main monitoring dashboard
      await expect(page.locator('[data-testid="monitoring-dashboard"]')).toHaveScreenshot('monitoring-dashboard-main.png');
      
      // System metrics panel
      await expect(page.locator('[data-testid="system-metrics"]')).toHaveScreenshot('system-metrics-panel.png');
      
      // Service health indicators
      await expect(page.locator('[data-testid="service-health-grid"]')).toHaveScreenshot('service-health-indicators.png');
    });

    test('Performance metrics and charts', async ({ page }) => {
      await page.click('[data-testid="monitoring-tab"]');
      
      // Performance charts
      await expect(page.locator('[data-testid="performance-charts"]')).toHaveScreenshot('performance-charts.png');
      
      // Ingestion metrics
      await expect(page.locator('[data-testid="ingestion-metrics"]')).toHaveScreenshot('ingestion-metrics-panel.png');
    });

  });

  test.describe('Error States and Messaging', () => {

    test('Form validation errors', async ({ page }) => {
      await page.click('[data-testid="create-kb-button"]');
      
      // Submit empty form to trigger validation
      await page.click('[data-testid="create-kb-submit"]');
      
      // Capture validation error states
      await expect(page.locator('[data-testid="kb-creation-form"]')).toHaveScreenshot('form-validation-errors.png');
    });

    test('Search error states', async ({ page }) => {
      await page.click('[data-testid="search-tab"]');
      
      // Empty search error
      await page.click('[data-testid="semantic-search-button"]');
      await expect(page.locator('[data-testid="search-error-message"]')).toHaveScreenshot('search-empty-query-error.png');
      
      // Invalid Cypher query error
      await page.click('[data-testid="graph-query-tab"]');
      await page.fill('[data-testid="cypher-query-input"]', 'INVALID SYNTAX');
      await page.click('[data-testid="execute-query-button"]');
      await page.waitForSelector('[data-testid="query-error"]');
      await expect(page.locator('[data-testid="query-error"]')).toHaveScreenshot('cypher-syntax-error.png');
    });

    test('Service connection error states', async ({ page }) => {
      // This would require actually disconnecting services to test
      // For now, we can test the UI states when errors are shown
      
      // Mock service down scenario (if we have a way to simulate this)
      // await page.route('**/api/status', route => route.fulfill({
      //   status: 503,
      //   body: JSON.stringify({ error: 'Service unavailable' })
      // }));
      
      // await page.reload();
      // await expect(page.locator('[data-testid="service-error-message"]')).toHaveScreenshot('service-connection-error.png');
    });

  });

  test.describe('Responsive Design', () => {

    test('Mobile viewport layouts', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      
      // Mobile landing page
      await expect(page).toHaveScreenshot('mobile-landing-page.png', { fullPage: true });
      
      // Mobile navigation
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-navigation"]')).toHaveScreenshot('mobile-navigation-menu.png');
    });

    test('Tablet viewport layouts', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad
      
      // Tablet dashboard
      await expect(page).toHaveScreenshot('tablet-dashboard.png', { fullPage: true });
      
      // Tablet search interface
      await page.click('[data-testid="search-tab"]');
      await expect(page.locator('[data-testid="search-interface"]')).toHaveScreenshot('tablet-search-interface.png');
    });

  });

  test.describe('Theme and Styling', () => {

    test('Light theme components', async ({ page }) => {
      // Ensure light theme is active
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
      });
      
      await expect(page.locator('[data-testid="main-dashboard"]')).toHaveScreenshot('light-theme-dashboard.png');
    });

    test('Dark theme components', async ({ page }) => {
      // Switch to dark theme
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      
      await expect(page.locator('[data-testid="main-dashboard"]')).toHaveScreenshot('dark-theme-dashboard.png');
    });

  });

});

// Visual testing utilities
async function waitForGraphRender(page: any) {
  // Wait for 3D graph to finish initial render
  await page.waitForFunction(() => {
    const canvas = document.querySelector('[data-testid="graph-3d-container"] canvas');
    return canvas && canvas.width > 0 && canvas.height > 0;
  }, { timeout: 20000 });
  
  // Additional wait for animations to settle
  await page.waitForTimeout(2000);
}

async function hideVariableContent(page: any) {
  // Hide timestamps, live metrics, and other variable content that changes between test runs
  await page.addStyleTag({
    content: `
      [data-testid="timestamp"],
      [data-testid="live-metrics"] .value,
      [data-testid="websocket-status"] {
        opacity: 0 !important;
      }
    `
  });
}