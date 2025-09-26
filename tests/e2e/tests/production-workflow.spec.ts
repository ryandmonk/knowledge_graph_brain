import { test, expect } from '@playwright/test';

test.describe('Complete Production Workflow', () => {
  test('Full Production Setup and Usage', async ({ page }) => {
    // Step 1: Complete Setup
    await page.goto('/ui');
    
    // Complete wizard
    await page.waitForSelector('h1:has-text("Knowledge Graph Brain")');
    
    // Service validation
    await page.waitForSelector('text=All services are running', { timeout: 60000 });
    await page.click('button:has-text("Next")');
    
    // Configuration - Production Mode
    const demoToggle = page.locator('[data-testid="demo-mode-toggle"]');
    if (await demoToggle.isChecked()) {
      await demoToggle.click(); // Switch to production
    }
    await page.click('button:has-text("Next")');
    
    // Configure all available connectors
    if (process.env.GITHUB_TOKEN) {
      await page.click('[data-testid="github-connector-config"]');
      await page.fill('[data-testid="github-token"]', process.env.GITHUB_TOKEN);
      await page.fill('[data-testid="github-repo"]', process.env.GITHUB_REPO);
      await page.click('[data-testid="test-connection"]');
      await expect(page.locator('text=Connection successful')).toBeVisible({ timeout: 30000 });
      await page.click('[data-testid="save-connector"]');
    }
    
    await page.click('button:has-text("Complete")');
    
    // Step 2: Navigate to Dashboard
    await page.click('button:has-text("Go to Dashboard")');
    await expect(page.url()).toContain('/dashboard');
    
    // Step 3: Verify Dashboard Functionality
    await expect(page.locator('[data-testid="dashboard-stats"]')).toBeVisible();
    await expect(page.locator('[data-testid="knowledge-bases-list"]')).toBeVisible();
    
    // Step 4: Test Search Functionality
    const searchBox = page.locator('[data-testid="search-input"]');
    await searchBox.fill('test query');
    await page.click('[data-testid="search-button"]');
    
    // Should show search results or no results message
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible({ timeout: 15000 });
    
    // Step 5: Test 3D Graph Visualization
    await page.click('[data-testid="view-graph"]');
    await expect(page.locator('[data-testid="3d-graph-canvas"]')).toBeVisible({ timeout: 30000 });
    
    // Test graph interactions
    await page.click('[data-testid="zoom-in"]');
    await page.click('[data-testid="zoom-out"]');
    await page.click('[data-testid="reset-view"]');
    
    // Step 6: Test Real-time Updates
    await page.goto('/ui#/dashboard');
    const initialNodeCount = await page.locator('[data-testid="node-count"]').textContent();
    
    // Trigger data sync
    await page.click('[data-testid="sync-data"]');
    await expect(page.locator('text=Sync in progress')).toBeVisible();
    await expect(page.locator('text=Sync complete')).toBeVisible({ timeout: 120000 });
  });
});
