# Playwright End-to-End Testing Suite

Comprehensive E2E testing for Knowledge Graph Brain using Playwright for browser automation, API testing, visual regression, and performance validation.

## 🎯 **Why Playwright for Knowledge Graph Brain?**

Playwright is the **perfect fit** for testing Knowledge Graph Brain because:

### **✅ Multi-Component Architecture Support**
- **Seamless Integration Testing**: Tests orchestrator + web-ui + connectors together in real workflows
- **API + UI Validation**: Single test suite validates both REST endpoints and React frontend
- **Real Browser Environment**: Tests 3D visualizations, WebSocket connections, file uploads in actual browsers

### **✅ Complex UI Testing Capabilities**  
- **3D Graph Visualization**: Tests WebGL canvas interactions, zoom, pan, node selection
- **Real-time Dashboard**: Validates WebSocket updates, live metrics, health indicators
- **Visual Regression**: Catches UI changes in complex React components automatically

### **✅ Enterprise Quality Assurance**
- **Cross-Browser Validation**: Chrome, Firefox, Safari, Edge compatibility testing
- **Performance Monitoring**: Memory usage, load times, API response benchmarking  
- **Network Conditions**: Tests under slow connections, offline scenarios
- **Mobile Responsiveness**: Tablet and phone viewport testing

## 📊 **Test Coverage Matrix**

| Test Category | Coverage | Files | Purpose |
|---------------|----------|--------|---------|
| **Core Workflows** | Setup → Ingest → Query → Visualize | `core-workflows.spec.ts` | End-to-end user journeys |
| **API Integration** | REST endpoints, MCP tools, Auth | `api/orchestrator-api.spec.ts` | Backend functionality validation |
| **Visual Regression** | UI components, themes, responsive | `visual/ui-visual-regression.spec.ts` | Prevent unintended UI changes |
| **Performance** | Load times, memory usage, rendering | `performance/app-performance.spec.ts` | Performance benchmarking |

## 🚀 **Quick Start**

### **1. Install Dependencies**
```bash
cd tests/e2e
npm install
npx playwright install
```

### **2. Start Services**
```bash
# From project root
./start-services.sh
```

### **3. Run Tests**

**🔐 Production Testing with Real Connectors:**
```bash
# Setup your API credentials first
./setup-credentials.sh --interactive

# Verify credentials are working
./verify-credentials.sh

# Run production connector tests
npm run test:production:headed
```

**🧪 Development/Demo Testing:**
```bash
# All tests
npm test

# Specific categories  
npm run test:api          # API-only tests
npm run test:visual       # Visual regression
npm run test:performance  # Performance benchmarks
npm run test:cross-browser # Chrome + Firefox + Safari

# Development
npm run test:headed       # See browser during tests
npm run test:debug       # Step-through debugging
npm run test:ui          # Interactive UI mode
```

## 📋 **Test Scenarios**

### **Core User Workflows**
- ✅ **Complete Setup Wizard**: Health checks → KB creation → schema config → source setup → ingestion
- ✅ **Search Functionality**: Semantic search → graph queries → GraphRAG natural language  
- ✅ **3D Visualization**: Graph loading → navigation controls → filtering → node interaction
- ✅ **Real-time Monitoring**: Dashboard updates → WebSocket connectivity → health indicators
- ✅ **Error Handling**: Invalid queries → network issues → service failures

### **API Integration Testing**
- ✅ **System Health**: `/status`, `/health` endpoint validation
- ✅ **Knowledge Base Management**: Schema registration → KB listing → status checking
- ✅ **Data Sources**: Add sources → configure mapping → list sources  
- ✅ **Ingestion Pipeline**: Trigger ingestion → monitor progress → verify completion
- ✅ **Search & Query**: Semantic search → Cypher queries → GraphRAG endpoints
- ✅ **MCP Tool Integration**: Tool availability → execution → result validation

### **Visual Regression Testing**  
- ✅ **Setup Wizard Screens**: Landing page → forms → configuration interfaces
- ✅ **Search Interfaces**: All search tabs → result layouts → error states
- ✅ **3D Visualization**: Loading states → controls → filter views
- ✅ **Monitoring Dashboard**: Metrics panels → charts → health indicators
- ✅ **Responsive Design**: Mobile → tablet → desktop layouts
- ✅ **Theme Support**: Light → dark theme component rendering

### **Performance Testing**
- ✅ **Page Load Times**: Landing page → search → 3D visualization load performance
- ✅ **Search Performance**: Response times → large result handling → query optimization
- ✅ **Memory Usage**: Navigation memory → 3D visualization → leak detection
- ✅ **API Performance**: Concurrent requests → response time analysis
- ✅ **Rendering Performance**: Large datasets → interaction responsiveness
- ✅ **Network Conditions**: Slow 3G → offline handling → recovery

## � **Connector Credential Testing**

### **Production Connector Integration**
Test real data connectors with actual API credentials for comprehensive validation:

**📋 Supported Connectors:**
- **🐙 GitHub**: Repository data, issues, PRs, commits, releases
- **📚 Confluence**: Spaces, pages, comments, attachments  
- **💬 Slack**: Channels, messages, users, threads
- **🛍️ Custom**: OpenAPI-defined connectors

**🚀 Quick Setup:**
```bash
# Interactive credential setup
./setup-credentials.sh --interactive

# Verify API access  
./verify-credentials.sh

# Run production tests
npm run test:production:headed
```

**📖 Detailed Guide:** See [CREDENTIAL_TESTING_GUIDE.md](./CREDENTIAL_TESTING_GUIDE.md)

### **Test Categories with Credentials**

| Test Type | Command | Requirements | Purpose |
|-----------|---------|--------------|---------|
| **GitHub Integration** | `npm run test:github` | `GITHUB_TOKEN` | Real repository ingestion |
| **Confluence Integration** | `npm run test:confluence` | Confluence API credentials | Document ingestion testing |
| **Complete Workflow** | `npm run test:workflow` | Any connector credentials | End-to-end production flow |
| **Smoke Tests** | `npm run test:smoke` | None (demo mode) | Quick functionality validation |

## 🔧 **Configuration**

### **Base Test Environment**
```bash
# Base URLs
PLAYWRIGHT_BASE_URL=http://localhost:3000       # Web UI URL (corrected)
ORCHESTRATOR_URL=http://localhost:3000          # API URL

# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# Test Data
TEST_KB_ID=playwright-test-demo
DEMO_MODE=true
```

### **Production Connector Credentials**
```bash
# GitHub Connector
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_REPOSITORIES=owner/repo1,owner/repo2

# Confluence Connector  
CONFLUENCE_BASE_URL=https://your-domain.atlassian.net
CONFLUENCE_EMAIL=your-email@company.com
CONFLUENCE_API_TOKEN=your_confluence_api_token

# Slack Connector (Optional)
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
```

### **Browser Configuration**
```typescript
// playwright.config.ts
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  { name: 'mobile-safari', use: { ...devices['iPhone 12'] } }
]
```

## 📈 **Test Reports & Analytics**

### **HTML Reports**
```bash
# Generate and view comprehensive HTML report
npm run show-report
```

### **Performance Metrics**  
- Page load times and Web Vitals (FCP, LCP)
- Memory usage tracking during navigation
- API response time analysis
- 3D rendering performance benchmarks

### **Visual Regression**
- Screenshot comparison with threshold-based matching
- Responsive design validation across viewports  
- Theme consistency verification
- Component-level visual change detection

## 🛠 **Development & Debugging**

### **Interactive Mode**
```bash
npm run test:ui
```
- Visual test runner with step-through debugging
- Real-time screenshot comparison
- Interactive test selection and execution

### **Headed Mode**
```bash  
npm run test:headed
```
- Watch tests execute in visible browser
- Perfect for debugging complex interactions
- See exactly what the automation is doing

### **Debug Mode**
```bash
npm run test:debug
```
- Pause execution with `await page.pause()`
- Inspect DOM, network, console in real-time
- Step through test code line by line

## 🧪 **Test Data Management**

### **Test Knowledge Bases**
- `playwright-test-demo`: Basic demo data for functional testing
- `playwright-test-performance`: Large dataset for performance testing
- Auto-created and cleaned up by global setup/teardown

### **Mock Data Strategy**
- Uses demo mode connectors for reliable, consistent test data
- No external API dependencies during testing
- Predictable results for assertion validation

## 🚦 **CI/CD Integration**

### **GitHub Actions Integration**
```yaml
- name: Run Playwright Tests  
  run: |
    npm ci
    npx playwright install --with-deps
    npm run test
    
- name: Upload test results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

### **Test Execution Strategy**
- **Pull Request**: Cross-browser smoke tests
- **Main Branch**: Full test suite including performance
- **Nightly**: Extended performance and visual regression testing
- **Release**: Complete cross-browser and mobile validation

## 🔍 **Troubleshooting**

### **Common Issues**

**Services Not Running**
```bash
# Ensure all services are healthy
./start-services.sh
curl http://localhost:3000/api/status
curl http://localhost:3100/ui
```

**Test Timeouts**
```bash
# Increase timeouts for slow environments  
PLAYWRIGHT_TIMEOUT=60000 npm test
```

**Visual Regression Failures**
```bash
# Update screenshots after intentional UI changes
npx playwright test --update-snapshots
```

**Memory Issues**
```bash
# Run with more memory for large datasets
NODE_OPTIONS="--max-old-space-size=4096" npm test
```

### **Test Environment Validation**
```bash
# Validate test environment health
npx playwright test --grep "System health"
```

## 📚 **Best Practices**

### **Test Organization**
- **Descriptive test names**: Clearly explain what scenario is being tested
- **Grouped by functionality**: Related tests in same describe blocks  
- **Independent tests**: Each test can run in isolation
- **Proper cleanup**: Test data cleaned up after execution

### **Reliable Assertions**
- **Wait for elements**: Use `waitForSelector` instead of fixed delays
- **Specific locators**: Use `data-testid` attributes for reliable element selection
- **Meaningful expectations**: Assert on actual business logic, not implementation details
- **Error context**: Include helpful error messages in assertions

### **Performance Considerations**
- **Parallel execution**: Tests run in parallel for faster feedback
- **Selective execution**: Use projects to run only relevant test categories
- **Resource cleanup**: Proper browser/context disposal to prevent memory leaks
- **Conditional execution**: Skip expensive tests in development environments

---

## 🎉 **Results**

With this Playwright test suite, Knowledge Graph Brain achieves:

- **🔒 Reliability**: Catch regressions before they reach users
- **🚀 Performance**: Ensure optimal user experience under all conditions  
- **🖥️ Compatibility**: Validate cross-browser and mobile functionality
- **📊 Quality**: Comprehensive coverage from API to UI to performance
- **🔄 Automation**: Integrated CI/CD with automated testing and reporting

**This represents production-grade QA testing that scales with your application complexity!**