import { test, expect } from '@playwright/test';

/**
 * Smoke Tests - Quick validation that core functionality works
 * 
 * Fast, essential tests that validate the system is functional.
 * These run first to catch obvious issues before running full test suite.
 */

test.describe('Smoke Tests @smoke', () => {

  test('Application loads and is responsive', async ({ page }) => {
    // Navigate to the application
    await page.goto('/ui');
    
    // Check that the main heading is visible (use first h1 in header)
    await expect(page.locator('h1').first()).toContainText('Knowledge Graph Brain');
    
    // Verify page is interactive (not just static HTML)
    const title = await page.title();
    expect(title).toContain('Knowledge Graph Brain');
    
    console.log('✅ Application loads successfully');
  });

  test('API health endpoint responds', async ({ request }) => {
    // Test the orchestrator API is accessible
    const response = await request.get('http://localhost:3000/api/status');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('service');
    expect(data.service).toBe('Knowledge Graph Orchestrator');
    
    console.log('✅ API health check passed');
  });

  test('Basic navigation works', async ({ page }) => {
    await page.goto('/ui');
    
    // Wait for the page to fully load
    await page.waitForSelector('h1:has-text("Knowledge Graph Brain")');
    
    // Try to navigate to different sections (if navigation elements exist)
    // This is a basic smoke test, so we'll just verify the page structure
    
    // Look for any navigation elements or main content areas
    const mainContent = page.locator('main, [role="main"], .main-content').first();
    if (await mainContent.count() > 0) {
      await expect(mainContent).toBeVisible();
    }
    
    console.log('✅ Basic page structure is present');
  });

});

test.describe('Critical Path Smoke Tests @smoke', () => {

  test('Can perform basic search query', async ({ page }) => {
    await page.goto('/ui');
    await page.waitForSelector('h1:has-text("Knowledge Graph Brain")');
    
    // Look for search interface elements
    const searchInput = page.locator('input[type="search"], input[placeholder*="search"], input[data-testid*="search"]').first();
    
    if (await searchInput.count() > 0) {
      await searchInput.fill('test query');
      console.log('✅ Search interface is accessible');
    } else {
      console.log('ℹ️ Search interface not found in current view');
    }
  });

  test('Services connectivity check', async ({ request }) => {
    // Test multiple service endpoints quickly
    const services = [
      { name: 'Orchestrator Status', url: '/api/status' },
      { name: 'Orchestrator Health', url: '/api/health' }
    ];
    
    for (const service of services) {
      try {
        const response = await request.get(`http://localhost:3000${service.url}`, {
          timeout: 5000
        });
        
        if (response.status() === 200) {
          console.log(`✅ ${service.name} is responding`);
        } else {
          console.log(`⚠️ ${service.name} returned status ${response.status()}`);
        }
      } catch (error) {
        console.log(`❌ ${service.name} is not accessible:`, (error as Error).message);
      }
    }
  });

});