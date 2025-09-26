import { test, expect } from '@playwright/test';

test.describe('GitHub Connector Integration', () => {
  test('GitHub Repository Connection and Data Ingestion', async ({ page }) => {
    // Ensure we have GitHub credentials
    if (!process.env.GITHUB_TOKEN) {
      test.skip('GITHUB_TOKEN not provided');
    }

    await page.goto('/ui#/setup');
    
    // Navigate to connectors
    await page.click('button:has-text("Next")'); // Service check
    await page.click('button:has-text("Next")'); // Configuration
    
    // Configure GitHub connector with real credentials
    await page.click('[data-testid="github-connector-config"]');
    
    await page.fill('[data-testid="github-token"]', process.env.GITHUB_TOKEN);
    await page.fill('[data-testid="github-repo"]', process.env.GITHUB_REPO);
    
    // Test connection
    await page.click('[data-testid="test-connection"]');
    await expect(page.locator('text=Connection successful')).toBeVisible({ timeout: 30000 });
    
    // Save configuration
    await page.click('[data-testid="save-connector"]');
    
    // Start data ingestion
    await page.click('[data-testid="start-ingestion"]');
    await expect(page.locator('text=Ingestion started')).toBeVisible();
    
    // Monitor ingestion progress
    await expect(page.locator('[data-testid="ingestion-progress"]')).toBeVisible({ timeout: 10000 });
    
    // Wait for completion (with reasonable timeout)
    await expect(page.locator('text=Ingestion complete')).toBeVisible({ timeout: 120000 });
    
    // Verify data was ingested
    await page.goto('/ui#/dashboard');
    await expect(page.locator('[data-testid="node-count"]')).toContainText(/[1-9]\d*/); // At least 1 node
  });
});
