import { test, expect } from '@playwright/test';

test.describe('Confluence Connector Integration', () => {
  test.beforeEach(async () => {
    // Validate required Confluence credentials
    const missingCredentials: string[] = [];
    if (!process.env.CONFLUENCE_BASE_URL) missingCredentials.push('CONFLUENCE_BASE_URL');
    if (!process.env.CONFLUENCE_EMAIL) missingCredentials.push('CONFLUENCE_EMAIL');
    if (!process.env.CONFLUENCE_API_TOKEN) missingCredentials.push('CONFLUENCE_API_TOKEN');
    
    if (missingCredentials.length > 0) {
      test.skip(true, `Confluence credentials missing: ${missingCredentials.join(', ')}. Configure with: ./setup-credentials.sh --interactive`);
    }
    
    console.log('📚 Testing with Confluence credentials configured');
    console.log(`   Domain: ${process.env.CONFLUENCE_BASE_URL}`);
    console.log(`   Email: ${process.env.CONFLUENCE_EMAIL}`);
  });

  test('Confluence Connection and Data Ingestion', async ({ page }) => {
    console.log('🚀 Starting Confluence connector integration test...');
    
    await page.goto('/ui#/setup');
    await page.waitForSelector('h1:has-text("Knowledge Graph Brain")');
    
    // Navigate through setup wizard
    console.log('📋 Navigating through setup wizard...');
    
    // Service check
    await page.waitForSelector('text=All services are running', { timeout: 60000 });
    await page.click('button:has-text("Next")');
    
    // Configuration - ensure production mode
    const demoToggle = page.locator('[data-testid="demo-mode-toggle"]');
    if (await demoToggle.isChecked()) {
      console.log('🔄 Switching from demo to production mode...');
      await demoToggle.click();
    }
    await page.click('button:has-text("Next")');
    
    // Configure Confluence connector
    console.log('🔧 Configuring Confluence connector...');
    await page.click('[data-testid="confluence-connector-config"]');
    await expect(page.locator('[data-testid="connector-modal"]')).toBeVisible();
    
    // Fill Confluence credentials
    await page.fill('[data-testid="confluence-url"]', process.env.CONFLUENCE_BASE_URL!);
    await page.fill('[data-testid="confluence-username"]', process.env.CONFLUENCE_EMAIL!);
    await page.fill('[data-testid="confluence-token"]', process.env.CONFLUENCE_API_TOKEN!);
    
    // Test connection with enhanced validation
    console.log('🧪 Testing Confluence connection...');
    await page.click('[data-testid="test-connection"]');
    
    // Wait for and validate connection result
    const connectionResult = page.locator('[data-testid="connection-result"]');
    await expect(connectionResult).toBeVisible({ timeout: 30000 });
    
    const isSuccess = await page.locator('text=Connection successful').isVisible();
    const isError = await page.locator('text=Connection failed').isVisible();
    
    if (isError) {
      const errorMessage = await page.locator('[data-testid="connection-error"]').textContent();
      console.error(`❌ Confluence connection failed: ${errorMessage}`);
      throw new Error(`Confluence connection failed: ${errorMessage}`);
    }
    
    expect(isSuccess).toBeTruthy();
    console.log('✅ Confluence connection successful');
    
    // Save configuration
    await page.click('[data-testid="save-connector"]');
    await expect(page.locator('[data-testid="connector-modal"]')).not.toBeVisible();
    
    // Complete setup and navigate to dashboard
    await page.click('button:has-text("Complete")');
    await page.click('button:has-text("Go to Dashboard")');
    
    await expect(page.url()).toContain('/dashboard');
    console.log('📊 Navigated to dashboard');
    
    // Optional: Test data ingestion if available
    const ingestButton = page.locator('[data-testid="start-ingestion"]');
    if (await ingestButton.isVisible()) {
      console.log('🔄 Starting Confluence data ingestion...');
      await ingestButton.click();
      
      // Monitor ingestion with longer timeout for Confluence
      const progressIndicator = page.locator('[data-testid="ingestion-progress"]');
      if (await progressIndicator.isVisible({ timeout: 10000 })) {
        console.log('📈 Monitoring Confluence ingestion progress...');
        await expect(page.locator('text=Ingestion complete')).toBeVisible({ timeout: 180000 });
        console.log('✅ Confluence data ingestion completed');
        
        // Verify Confluence data in knowledge graph
        const nodeCount = page.locator('[data-testid="node-count"]');
        if (await nodeCount.isVisible()) {
          await expect(nodeCount).toContainText(/[1-9]\d*/);
          console.log('✅ Confluence data successfully ingested');
        }
      }
    }
    
    // Verify Confluence connector is listed
    await expect(page.locator('text=Confluence')).toBeVisible();
    console.log('✅ Confluence connector integration test completed successfully');
  });

  test('Confluence Connector Error Handling', async ({ page }) => {
    console.log('🧪 Testing Confluence connector error handling...');
    
    await page.goto('/ui#/setup');
    await page.waitForSelector('h1:has-text("Knowledge Graph Brain")');
    
    // Navigate to connector configuration
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    
    await page.click('[data-testid="confluence-connector-config"]');
    
    // Test with invalid domain
    await page.fill('[data-testid="confluence-url"]', 'https://invalid-domain-12345.atlassian.net');
    await page.fill('[data-testid="confluence-username"]', 'test@example.com');
    await page.fill('[data-testid="confluence-token"]', 'invalid_token');
    
    await page.click('[data-testid="test-connection"]');
    
    // Should show appropriate error message
    await expect(page.locator('text=Connection failed')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[data-testid="connection-error"]')).toContainText(/authentication|domain|invalid/i);
    
    console.log('✅ Confluence error handling validation completed');
  });

  test('Confluence Spaces Discovery', async ({ page }) => {
    console.log('🏢 Testing Confluence spaces discovery...');
    
    await page.goto('/ui#/setup');
    await page.waitForSelector('h1:has-text("Knowledge Graph Brain")');
    
    // Navigate to connector configuration
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    
    await page.click('[data-testid="confluence-connector-config"]');
    
    // Fill valid credentials
    await page.fill('[data-testid="confluence-url"]', process.env.CONFLUENCE_BASE_URL!);
    await page.fill('[data-testid="confluence-username"]', process.env.CONFLUENCE_EMAIL!);
    await page.fill('[data-testid="confluence-token"]', process.env.CONFLUENCE_API_TOKEN!);
    
    // Test connection to ensure access
    await page.click('[data-testid="test-connection"]');
    await expect(page.locator('text=Connection successful')).toBeVisible({ timeout: 30000 });
    
    // Check if spaces are discovered (if UI supports this)
    const spacesSelector = page.locator('[data-testid="confluence-spaces"]');
    if (await spacesSelector.isVisible()) {
      console.log('✅ Confluence spaces discovered');
    }
    
    console.log('✅ Confluence spaces discovery test completed');
  });
});
