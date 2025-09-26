import { test, expect } from '@playwright/test';

test.describe('Confluence Connector Integration', () => {
  test('Confluence Connection and Data Ingestion', async ({ page }) => {
    // Skip if no Confluence credentials
    if (!process.env.CONFLUENCE_URL || !process.env.CONFLUENCE_TOKEN) {
      test.skip('Confluence credentials not provided');
    }

    await page.goto('/ui#/setup');
    
    // Navigate to connectors
    await page.click('button:has-text("Next")'); // Service check
    await page.click('button:has-text("Next")'); // Configuration
    
    // Configure Confluence connector
    await page.click('[data-testid="confluence-connector-config"]');
    
    await page.fill('[data-testid="confluence-url"]', process.env.CONFLUENCE_URL);
    await page.fill('[data-testid="confluence-username"]', process.env.CONFLUENCE_USERNAME);
    await page.fill('[data-testid="confluence-token"]', process.env.CONFLUENCE_TOKEN);
    
    // Test connection
    await page.click('[data-testid="test-connection"]');
    await expect(page.locator('text=Connection successful')).toBeVisible({ timeout: 30000 });
    
    // Save and start ingestion
    await page.click('[data-testid="save-connector"]');
    await page.click('[data-testid="start-ingestion"]');
    
    // Monitor progress
    await expect(page.locator('text=Ingestion complete')).toBeVisible({ timeout: 180000 });
    
    // Verify Confluence data in dashboard
    await page.goto('/ui#/dashboard');
    await expect(page.locator('text=Confluence')).toBeVisible();
  });
});
