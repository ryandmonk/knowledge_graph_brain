import { test, expect } from '@playwright/test';

test.describe('Production UI Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ui');
    // Wait for React app to load
    await page.waitForSelector('h1:has-text("Knowledge Graph Brain")', { timeout: 30000 });
  });

  test('Complete Setup Wizard Flow - Production Ready', async ({ page }) => {
    // Phase 1: Service Check
    await expect(page.locator('h2:has-text("Service Check")')).toBeVisible();
    
    // Check all service indicators
    const serviceIndicators = page.locator('[data-testid="service-indicator"]');
    await expect(serviceIndicators).toHaveCount(3); // Orchestrator, Neo4j, Web UI
    
    // Wait for all services to be green
    await page.waitForFunction(() => {
      const indicators = document.querySelectorAll('[data-testid="service-indicator"] .text-green-600');
      return indicators.length >= 3;
    }, {}, { timeout: 60000 });

    // Click Next
    await page.click('button:has-text("Next")');

    // Phase 2: Configuration
    await expect(page.locator('h2:has-text("Configuration")')).toBeVisible();
    
    // Test Demo Mode Toggle
    const demoToggle = page.locator('[data-testid="demo-mode-toggle"]');
    await expect(demoToggle).toBeVisible();
    
    // Toggle demo mode and verify state change
    const initialState = await demoToggle.isChecked();
    await demoToggle.click();
    await expect(demoToggle).toBeChecked(!initialState);
    
    // Test LLM Model Selection
    const llmSelector = page.locator('[data-testid="llm-selector"]');
    await expect(llmSelector).toBeVisible();
    await llmSelector.click();
    await page.click('text=OpenAI GPT-4');
    
    // Click Next
    await page.click('button:has-text("Next")');

    // Phase 3: Connectors
    await expect(page.locator('h2:has-text("Connectors")')).toBeVisible();
    
    // Verify all connector types are available
    await expect(page.locator('text=GitHub')).toBeVisible();
    await expect(page.locator('text=Confluence')).toBeVisible();
    await expect(page.locator('text=Slack')).toBeVisible();
    
    // Test GitHub connector configuration
    await page.click('[data-testid="github-connector-config"]');
    await expect(page.locator('[data-testid="connector-modal"]')).toBeVisible();
    
    // Fill GitHub configuration
    await page.fill('[data-testid="github-token"]', process.env.GITHUB_TOKEN || 'test-token');
    await page.fill('[data-testid="github-repo"]', process.env.GITHUB_REPO || 'test-repo');
    
    // Test connection
    await page.click('[data-testid="test-connection"]');
    await expect(page.locator('text=Connection successful')).toBeVisible({ timeout: 15000 });
    
    // Save configuration
    await page.click('[data-testid="save-connector"]');
    await expect(page.locator('[data-testid="connector-modal"]')).not.toBeVisible();
    
    // Verify GitHub connector is now configured
    await expect(page.locator('[data-testid="github-connector-status"]:has-text("Configured")')).toBeVisible();

    // Click Complete
    await page.click('button:has-text("Complete")');

    // Phase 4: Completion
    await expect(page.locator('h2:has-text("Setup Complete")')).toBeVisible();
    await expect(page.locator('text=Your Knowledge Graph Brain is ready!')).toBeVisible();
    
    // Navigate to Dashboard
    await page.click('button:has-text("Go to Dashboard")');
    await expect(page.url()).toContain('/dashboard');
  });

  test('Navigation and Button Functionality', async ({ page }) => {
    // Test all navigation links work
    await page.click('text=Dashboard');
    await expect(page.url()).toContain('/dashboard');
    
    await page.click('text=Setup');
    await expect(page.url()).toContain('/setup');
    
    await page.click('text=Graph');
    await expect(page.url()).toContain('/graph');
    
    // Test all critical buttons are functional
    const criticalButtons = [
      'button:has-text("Next")',
      'button:has-text("Previous")', 
      'button:has-text("Test Connection")',
      'button:has-text("Save")',
      'button:has-text("Configure")'
    ];
    
    for (const buttonSelector of criticalButtons) {
      const button = page.locator(buttonSelector);
      if (await button.count() > 0) {
        await expect(button).toBeEnabled();
        // Verify button has proper styling and isn't broken
        await expect(button).not.toHaveClass(/opacity-50|cursor-not-allowed/);
      }
    }
  });

  test('Demo/Production Mode Switching', async ({ page }) => {
    // Navigate to configuration step
    await page.click('button:has-text("Next")'); // Skip service check
    
    const demoToggle = page.locator('[data-testid="demo-mode-toggle"]');
    
    // Test switching to Demo Mode
    if (!(await demoToggle.isChecked())) {
      await demoToggle.click();
    }
    await expect(demoToggle).toBeChecked();
    await expect(page.locator('text=Demo data will be used')).toBeVisible();
    
    // Test switching to Production Mode
    await demoToggle.click();
    await expect(demoToggle).not.toBeChecked();
    await expect(page.locator('text=Connect your own data sources')).toBeVisible();
    
    // Verify production mode shows connector configuration
    await page.click('button:has-text("Next")');
    await expect(page.locator('[data-testid="connector-configuration"]')).toBeVisible();
  });

  test('Connector Configuration Forms', async ({ page }) => {
    // Navigate to connectors step
    await page.click('button:has-text("Next")'); // Service check
    await page.click('button:has-text("Next")'); // Configuration
    
    // Test GitHub Connector
    await page.click('[data-testid="github-connector-config"]');
    const githubModal = page.locator('[data-testid="connector-modal"]');
    await expect(githubModal).toBeVisible();
    
    // Test form validation
    await page.click('[data-testid="test-connection"]');
    await expect(page.locator('text=Please fill in all required fields')).toBeVisible();
    
    // Fill required fields
    await page.fill('[data-testid="github-token"]', 'test-token');
    await page.fill('[data-testid="github-repo"]', 'test/repo');
    
    // Test connection validation
    await page.click('[data-testid="test-connection"]');
    // Should show connection result (success or error with helpful message)
    
    await page.click('[data-testid="close-modal"]');
    
    // Test Confluence Connector  
    await page.click('[data-testid="confluence-connector-config"]');
    const confluenceModal = page.locator('[data-testid="connector-modal"]');
    await expect(confluenceModal).toBeVisible();
    
    // Verify all required fields are present
    await expect(page.locator('[data-testid="confluence-url"]')).toBeVisible();
    await expect(page.locator('[data-testid="confluence-username"]')).toBeVisible();
    await expect(page.locator('[data-testid="confluence-token"]')).toBeVisible();
  });

  test('Error Handling and Recovery', async ({ page }) => {
    // Test invalid configurations
    await page.click('button:has-text("Next")'); // Service check
    await page.click('button:has-text("Next")'); // Configuration  
    
    // Try to configure GitHub with invalid token
    await page.click('[data-testid="github-connector-config"]');
    await page.fill('[data-testid="github-token"]', 'invalid-token');
    await page.fill('[data-testid="github-repo"]', 'nonexistent/repo');
    
    await page.click('[data-testid="test-connection"]');
    
    // Should show helpful error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('text=Connection failed')).toBeVisible();
    
    // Test error recovery - fix the configuration
    await page.fill('[data-testid="github-token"]', process.env.GITHUB_TOKEN || 'valid-token');
    await page.fill('[data-testid="github-repo"]', process.env.GITHUB_REPO || 'valid/repo');
    
    // Should now succeed or show appropriate message
    await page.click('[data-testid="test-connection"]');
  });
});
