#!/bin/bash

# Production-Ready E2E Testing & Fixing Strategy
# Knowledge Graph Brain - Comprehensive QA and Issue Resolution

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Knowledge Graph Brain - Production Readiness Suite${NC}"
echo -e "${BLUE}=======================================================${NC}"
echo ""

# Configuration
E2E_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$E2E_DIR")")"
FIXES_DIR="$E2E_DIR/production-fixes"
CONNECTORS_DIR="$E2E_DIR/connector-tests"

# Test environment configuration
export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://localhost:3000}"
export ORCHESTRATOR_URL="${ORCHESTRATOR_URL:-http://localhost:3000}"
export NEO4J_URI="${NEO4J_URI:-bolt://localhost:7687}"
export NEO4J_USER="${NEO4J_USER:-neo4j}"
export NEO4J_PASSWORD="${NEO4J_PASSWORD:-password}"

# User's actual credentials (to be configured)
export GITHUB_USERNAME="${GITHUB_USERNAME:-ryandmonk}"
export GITHUB_REPO="${GITHUB_REPO:-knowledge_graph_brain}"
export GITHUB_TOKEN="${GITHUB_TOKEN:-}" # User needs to set this
export CONFLUENCE_URL="${CONFLUENCE_URL:-}" # User needs to set this
export CONFLUENCE_USERNAME="${CONFLUENCE_USERNAME:-}" # User needs to set this
export CONFLUENCE_TOKEN="${CONFLUENCE_TOKEN:-}" # User needs to set this

# Create directories
mkdir -p "$FIXES_DIR"
mkdir -p "$CONNECTORS_DIR"

echo -e "${YELLOW}🧹 Phase 1: Database Reset & Clean Environment${NC}"
echo "=================================================="

# Clear Neo4j database
clear_database() {
    echo -e "${BLUE}🗑️  Clearing Neo4j database for fresh testing...${NC}"
    curl -u "$NEO4J_USER:$NEO4J_PASSWORD" -X POST \
        http://localhost:7474/db/neo4j/tx/commit \
        -H "Content-Type: application/json" \
        -d '{"statements":[{"statement":"MATCH (n) DETACH DELETE n"}]}' > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database cleared successfully${NC}"
    else
        echo -e "${RED}❌ Failed to clear database${NC}"
        exit 1
    fi
}

echo -e "${YELLOW}🔍 Phase 2: UI Issue Identification & Fixing${NC}"
echo "=============================================="

# Create comprehensive UI test suite
create_ui_tests() {
    cat > "$FIXES_DIR/ui-comprehensive.spec.ts" << 'EOF'
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
EOF

    echo -e "${GREEN}✅ Comprehensive UI test suite created${NC}"
}

echo -e "${YELLOW}🔌 Phase 3: Connector Integration Testing${NC}"
echo "=========================================="

# Create connector-specific tests  
create_connector_tests() {
    cat > "$CONNECTORS_DIR/github-integration.spec.ts" << 'EOF'
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
EOF

    cat > "$CONNECTORS_DIR/confluence-integration.spec.ts" << 'EOF'
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
EOF

    echo -e "${GREEN}✅ Connector integration tests created${NC}"
}

echo -e "${YELLOW}🎯 Phase 4: End-to-End Production Workflow${NC}"
echo "=========================================="

# Create complete production workflow test
create_production_workflow() {
    cat > "$FIXES_DIR/production-workflow.spec.ts" << 'EOF'
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
EOF

    echo -e "${GREEN}✅ Production workflow test created${NC}"
}

# Main execution function
main() {
    echo -e "${BLUE}Starting Production Readiness Testing...${NC}"
    
    # Phase 1: Clean environment
    clear_database
    
    # Phase 2: Create comprehensive tests
    create_ui_tests
    create_connector_tests  
    create_production_workflow
    
    echo ""
    echo -e "${GREEN}🎉 Production Testing Suite Created!${NC}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Set your credentials:"
    echo "   export GITHUB_TOKEN='your_github_token'"
    echo "   export CONFLUENCE_URL='your_confluence_url'"
    echo "   export CONFLUENCE_USERNAME='your_username'"
    echo "   export CONFLUENCE_TOKEN='your_confluence_token'"
    echo ""
    echo "2. Run comprehensive tests:"
    echo "   npx playwright test production-fixes/ui-comprehensive.spec.ts --headed"
    echo "   npx playwright test connector-tests/ --headed"
    echo "   npx playwright test production-fixes/production-workflow.spec.ts --headed"
    echo ""
    echo "3. Fix issues identified in test results"
    echo "4. Re-run tests until all pass"
    echo ""
    echo -e "${BLUE}The tests will identify and help fix:${NC}"
    echo "• Non-working buttons and interactions"
    echo "• Demo/Production mode switching issues"  
    echo "• Connector configuration problems"
    echo "• Navigation and routing issues"
    echo "• Real data ingestion and processing"
    echo "• Complete end-to-end user workflows"
}

# Execute if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi