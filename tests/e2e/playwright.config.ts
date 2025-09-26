import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

// Load environment variables
config();

/**
 * Playwright Configuration for Knowledge Graph Brain E2E Testing
 * 
 * Comprehensive testing setup for:
 * - Multi-service architecture (orchestrator + web-ui + connectors)
 * - Real browser interactions with 3D visualizations
 * - API integration testing alongside UI flows
 * - Cross-browser compatibility validation
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  
  // Test Configuration
  timeout: 60000, // 60 second timeout for complex workflows
  expect: {
    timeout: 10000, // 10 second assertion timeout
    // Visual comparison settings for 3D graphs
    toHaveScreenshot: { 
      threshold: 0.2, 
      animations: 'disabled' // Disable animations for consistent screenshots
    }
  },
  
  // Test Execution
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporting
  reporter: process.env.CI 
    ? [
        ['html', { outputFolder: './playwright-report' }],
        ['json', { outputFile: './test-results/results.json' }],
        ['junit', { outputFile: './test-results/junit.xml' }],
        ['github']
      ]
    : [
        ['html', { outputFolder: './playwright-report' }],
        ['json', { outputFile: './test-results/results.json' }],
        ['list']
      ],
  
  // Global test configuration
  use: {
    // Base URL for the application
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    // API testing configuration
    extraHTTPHeaders: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    
    // Browser behavior
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    // Screenshots and videos on failure
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    
    // Ignore HTTPS errors in test environment
    ignoreHTTPSErrors: true
  },

  // Test environment setup
  globalSetup: require.resolve('./global-setup'),
  globalTeardown: require.resolve('./global-teardown'),

  // Projects for different test scenarios
  projects: [
    // Desktop Browsers - Primary test suite
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile devices - Responsive testing
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },

    // API-only tests (no browser)
    {
      name: 'api-tests',
      testMatch: '**/api/**/*.spec.ts',
      use: {
        // API testing without browser context
        headless: true
      }
    },

    // Performance testing
    {
      name: 'performance',
      testMatch: '**/performance/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        // Enable performance metrics
        launchOptions: {
          args: ['--enable-precise-memory-info']
        }
      }
    },

    // Visual regression testing
    {
      name: 'visual',
      testMatch: '**/visual/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        // Consistent visual testing
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1
      }
    }
  ],

  // Development server configuration
  webServer: process.env.CI ? undefined : [
    {
      command: 'cd ../../ && ./start-services.sh',
      url: 'http://localhost:3100/ui',
      reuseExistingServer: !process.env.CI,
      timeout: 120000, // 2 minutes to start all services
      stdout: 'pipe',
      stderr: 'pipe'
    }
  ]
});