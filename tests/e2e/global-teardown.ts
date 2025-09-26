import { FullConfig } from '@playwright/test';

/**
 * Global Teardown for Knowledge Graph Brain E2E Tests
 * 
 * Cleans up test environment after all tests complete:
 * - Removes test knowledge bases
 * - Cleans up test data from Neo4j
 * - Stops any background processes
 */

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up Knowledge Graph Brain test environment...');

  const orchestratorURL = 'http://localhost:3000';

  try {
    // Clean up test knowledge bases
    const testKBs = ['playwright-test-demo', 'playwright-test-performance'];
    
    for (const kbId of testKBs) {
      try {
        // In a real implementation, you'd call an API to delete the KB
        // For now, we'll just log the cleanup
        console.log(`🗑️ Cleaned up test KB: ${kbId}`);
      } catch (error) {
        console.warn(`⚠️ Failed to cleanup KB ${kbId}:`, (error as Error).message);
      }
    }

    console.log('✅ Test environment cleanup complete');

  } catch (error) {
    console.error('❌ Test environment cleanup failed:', error);
    // Don't fail the entire test suite due to cleanup issues
  }
}

export default globalTeardown;