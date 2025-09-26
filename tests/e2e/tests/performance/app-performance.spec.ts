import { test, expect } from '@playwright/test';

/**
 * Performance Testing
 * 
 * Tests application performance under various load conditions:
 * - Page load times and rendering performance
 * - Large dataset handling (search, visualization)
 * - Memory usage and leak detection
 * - API response times under load
 * - 3D graph rendering performance
 */

test.describe('Performance Tests', () => {

  test.describe('Page Load Performance', () => {

    test('Landing page load performance', async ({ page }) => {
      // Start performance measurement
      const startTime = Date.now();
      
      await page.goto('/ui');
      
      // Wait for critical content to load
      await page.waitForSelector('h1:has-text("Knowledge Graph Brain")', { timeout: 15000 });
      
      const loadTime = Date.now() - startTime;
      
      // Assert reasonable load time (under 3 seconds)
      expect(loadTime).toBeLessThan(3000);
      
      // Check Web Vitals
      const webVitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          // Simplified Web Vitals measurement
          const paintEntries = performance.getEntriesByType('paint');
          const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
          const lcp = paintEntries.find(entry => entry.name === 'largest-contentful-paint');
          
          resolve({
            fcp: fcp ? fcp.startTime : null,
            lcp: lcp ? lcp.startTime : null,
            domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
          });
        });
      });
      
      console.log('Web Vitals:', webVitals);
      
      // Assert Web Vitals thresholds
      if (webVitals.fcp) {
        expect(webVitals.fcp).toBeLessThan(2000); // FCP under 2s
      }
    });

    test('Search interface load performance', async ({ page }) => {
      await page.goto('/ui');
      await page.waitForSelector('h1:has-text("Knowledge Graph Brain")');
      
      const startTime = Date.now();
      
      await page.click('[data-testid="search-tab"]');
      await page.waitForSelector('[data-testid="search-interface"]');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(1000); // Navigation under 1s
    });

    test('3D visualization load performance', async ({ page }) => {
      await page.goto('/ui');
      await page.waitForSelector('h1:has-text("Knowledge Graph Brain")');
      
      const startTime = Date.now();
      
      await page.click('[data-testid="visualization-tab"]');
      await page.waitForSelector('[data-testid="graph-3d-container"] canvas', { timeout: 20000 });
      
      const loadTime = Date.now() - startTime;
      
      // 3D visualization can take longer due to WebGL initialization
      expect(loadTime).toBeLessThan(10000); // Under 10 seconds
      
      console.log('3D Visualization load time:', loadTime, 'ms');
    });

  });

  test.describe('Search Performance', () => {

    test('Semantic search response time', async ({ page }) => {
      await page.goto('/ui');
      await page.click('[data-testid="search-tab"]');
      
      const searchQuery = 'knowledge graphs and machine learning';
      await page.fill('[data-testid="semantic-search-input"]', searchQuery);
      
      const startTime = Date.now();
      await page.click('[data-testid="semantic-search-button"]');
      
      // Wait for results
      await page.waitForSelector('[data-testid="search-results"]', { timeout: 15000 });
      
      const responseTime = Date.now() - startTime;
      
      // Semantic search should complete in reasonable time
      expect(responseTime).toBeLessThan(5000); // Under 5 seconds
      
      console.log('Semantic search response time:', responseTime, 'ms');
    });

    test('Graph query performance', async ({ page }) => {
      await page.goto('/ui');
      await page.click('[data-testid="search-tab"]');
      await page.click('[data-testid="graph-query-tab"]');
      
      const cypherQuery = 'MATCH (d:Document)-[r:AUTHORED_BY]->(p:Person) RETURN d.title, p.name LIMIT 100';
      await page.fill('[data-testid="cypher-query-input"]', cypherQuery);
      
      const startTime = Date.now();
      await page.click('[data-testid="execute-query-button"]');
      
      await page.waitForSelector('[data-testid="query-results"]', { timeout: 10000 });
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(3000); // Graph queries should be fast
      
      console.log('Graph query response time:', responseTime, 'ms');
    });

    test('Large result set handling', async ({ page }) => {
      await page.goto('/ui');
      await page.click('[data-testid="search-tab"]');
      
      // Search for broad term likely to return many results
      await page.fill('[data-testid="semantic-search-input"]', 'document');
      
      const startTime = Date.now();
      await page.click('[data-testid="semantic-search-button"]');
      
      await page.waitForSelector('[data-testid="search-results"]', { timeout: 20000 });
      
      const responseTime = Date.now() - startTime;
      
      // Even with large result sets, should be reasonable
      expect(responseTime).toBeLessThan(10000);
      
      // Check that pagination or limiting is working
      const resultCount = await page.locator('[data-testid="search-result-item"]').count();
      expect(resultCount).toBeGreaterThan(0);
      expect(resultCount).toBeLessThanOrEqual(50); // Should be paginated/limited
      
      console.log('Large search - Results:', resultCount, 'Time:', responseTime, 'ms');
    });

  });

  test.describe('Memory and Resource Usage', () => {

    test('Memory usage during navigation', async ({ page }) => {
      await page.goto('/ui');
      
      // Get baseline memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit
        } : null;
      });
      
      if (initialMemory) {
        console.log('Initial memory usage:', initialMemory);
      }
      
      // Navigate through different sections
      const sections = [
        '[data-testid="search-tab"]',
        '[data-testid="visualization-tab"]', 
        '[data-testid="monitoring-tab"]'
      ];
      
      for (const section of sections) {
        await page.click(section);
        await page.waitForTimeout(2000); // Allow section to fully load
        
        const currentMemory = await page.evaluate(() => {
          return (performance as any).memory ? {
            used: (performance as any).memory.usedJSHeapSize,
            total: (performance as any).memory.totalJSHeapSize
          } : null;
        });
        
        if (currentMemory && initialMemory) {
          const memoryIncrease = currentMemory.used - initialMemory.used;
          console.log(`Memory after ${section}:`, currentMemory, 'Increase:', memoryIncrease);
          
          // Memory shouldn't grow excessively (under 50MB increase)
          expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
        }
      }
    });

    test('3D visualization memory usage', async ({ page }) => {
      await page.goto('/ui');
      
      const beforeMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      // Load 3D visualization
      await page.click('[data-testid="visualization-tab"]');
      await page.waitForSelector('[data-testid="graph-3d-container"] canvas', { timeout: 20000 });
      
      // Wait for graph to fully render
      await page.waitForTimeout(5000);
      
      const afterMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      const memoryDifference = afterMemory - beforeMemory;
      console.log('3D Visualization memory usage:', memoryDifference / (1024 * 1024), 'MB');
      
      // 3D visualization memory usage should be reasonable (under 100MB)
      expect(memoryDifference).toBeLessThan(100 * 1024 * 1024);
    });

  });

  test.describe('API Performance', () => {

    test('Concurrent API requests handling', async ({ page }) => {
      await page.goto('/ui');
      
      // Intercept API calls to measure response times
      const apiCalls: { url: string; duration: number }[] = [];
      
      page.route('**/api/**', async (route) => {
        const startTime = Date.now();
        const response = await route.fetch();
        const duration = Date.now() - startTime;
        
        apiCalls.push({
          url: route.request().url(),
          duration
        });
        
        route.fulfill({ response });
      });
      
      // Trigger multiple API calls by navigating and performing actions
      await page.click('[data-testid="search-tab"]');
      await page.fill('[data-testid="semantic-search-input"]', 'test query');
      await page.click('[data-testid="semantic-search-button"]');
      
      // Wait for requests to complete
      await page.waitForTimeout(5000);
      
      // Analyze API performance
      if (apiCalls.length > 0) {
        const avgResponseTime = apiCalls.reduce((sum, call) => sum + call.duration, 0) / apiCalls.length;
        const maxResponseTime = Math.max(...apiCalls.map(call => call.duration));
        
        console.log('API Performance:', {
          totalCalls: apiCalls.length,
          avgResponseTime,
          maxResponseTime,
          calls: apiCalls
        });
        
        // API calls should generally be under 2 seconds
        expect(avgResponseTime).toBeLessThan(2000);
        expect(maxResponseTime).toBeLessThan(10000);
      }
    });

  });

  test.describe('Rendering Performance', () => {

    test('Large data set visualization performance', async ({ page }) => {
      await page.goto('/ui');
      
      // Navigate to visualization with potentially large dataset
      await page.click('[data-testid="visualization-tab"]');
      
      const renderStartTime = Date.now();
      
      await page.waitForSelector('[data-testid="graph-3d-container"] canvas', { timeout: 30000 });
      
      // Wait for initial render to complete
      await page.waitForFunction(() => {
        const canvas = document.querySelector('[data-testid="graph-3d-container"] canvas') as HTMLCanvasElement;
        return canvas && canvas.width > 0;
      }, { timeout: 20000 });
      
      const renderTime = Date.now() - renderStartTime;
      console.log('Large dataset visualization render time:', renderTime, 'ms');
      
      // Should render within reasonable time
      expect(renderTime).toBeLessThan(15000);
      
      // Test interaction responsiveness
      const interactionStart = Date.now();
      
      // Test zoom interaction
      await page.click('[data-testid="zoom-in-button"]');
      await page.waitForTimeout(1000); // Allow zoom animation
      
      const interactionTime = Date.now() - interactionStart;
      console.log('Graph interaction response time:', interactionTime, 'ms');
      
      // Interactions should be responsive
      expect(interactionTime).toBeLessThan(2000);
    });

    test('Search results rendering performance', async ({ page }) => {
      await page.goto('/ui');
      await page.click('[data-testid="search-tab"]');
      
      // Perform search that should return multiple results
      await page.fill('[data-testid="semantic-search-input"]', 'knowledge');
      
      const renderStartTime = Date.now();
      await page.click('[data-testid="semantic-search-button"]');
      
      // Wait for all result items to be visible
      await page.waitForSelector('[data-testid="search-result-item"]', { timeout: 15000 });
      
      const renderTime = Date.now() - renderStartTime;
      console.log('Search results render time:', renderTime, 'ms');
      
      // Results should render quickly
      expect(renderTime).toBeLessThan(5000);
      
      // Check that results are actually visible and properly formatted
      const resultCount = await page.locator('[data-testid="search-result-item"]').count();
      expect(resultCount).toBeGreaterThan(0);
      
      // Verify first result is properly rendered (not just placeholder)
      const firstResult = page.locator('[data-testid="search-result-item"]').first();
      await expect(firstResult).toContainText(/\w+/); // Contains actual words
    });

  });

  test.describe('Network Performance', () => {

    test('Performance under slow network conditions', async ({ page, context }) => {
      // Simulate slow 3G network
      await context.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
        await route.continue();
      });
      
      const loadStartTime = Date.now();
      
      await page.goto('/ui');
      await page.waitForSelector('h1:has-text("Knowledge Graph Brain")', { timeout: 20000 });
      
      const loadTime = Date.now() - loadStartTime;
      console.log('Load time under slow network:', loadTime, 'ms');
      
      // Should still be usable under slow network (within 10 seconds)
      expect(loadTime).toBeLessThan(10000);
    });

  });

});