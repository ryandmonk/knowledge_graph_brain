import chalk from 'chalk';

export interface TestOptions {
  server?: string;
  format?: 'text' | 'json';
  verbose?: boolean;
  timeout?: number;
}

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration_ms: number;
  error?: string;
  details?: any;
}

interface TestSuite {
  total_tests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration_ms: number;
  results: TestResult[];
}

export async function testCommand(options: TestOptions = {}) {
  const serverUrl = options.server || 'http://localhost:3000';
  const timeout = options.timeout || 30000;
  
  if (options.format !== 'json') {
    console.log(chalk.bold(`\n🧪 Knowledge Graph Brain Connectivity Tests`));
    console.log(chalk.gray(`Server: ${serverUrl}`));
    console.log(chalk.gray(`Timeout: ${timeout}ms\n`));
  }
  
  const suite: TestSuite = {
    total_tests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration_ms: 0,
    results: []
  };
  
  const startTime = Date.now();
  
  try {
    // Test 1: Orchestrator Health Check
    await runTest(suite, 'Orchestrator Health Check', async () => {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(`${serverUrl}/api/status`, {
        timeout: timeout / 2
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return {
        service: data.service,
        version: data.version,
        uptime: data.uptime_seconds
      };
    }, options);
    
    // Test 2: Neo4j Connectivity
    await runTest(suite, 'Neo4j Database Connection', async () => {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(`${serverUrl}/api/status`);
      const data = await response.json();
      
      if (!data.neo4j_connected) {
        throw new Error('Neo4j is not connected');
      }
      
      return {
        connected: data.neo4j_connected,
        total_nodes: data.total_nodes,
        total_relationships: data.total_relationships
      };
    }, options);
    
    // Test 3: MCP Capabilities
    await runTest(suite, 'MCP Capabilities Check', async () => {
      const fetch = (await import('node-fetch')).default;
      
      // Test register_schema capability
      const testSchema = {
        kb_id: 'connectivity-test',
        schema: {
          nodes: [{ label: 'TestNode', key: 'id', props: ['id', 'name'] }],
          relationships: []
        },
        mappings: { sources: [] }
      };
      
      const response = await fetch(`${serverUrl}/api/register-schema`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testSchema)
      });
      
      if (response.status === 404) {
        throw new Error('MCP endpoints not available - check orchestrator configuration');
      }
      
      // Clean up test schema if it was created
      if (response.ok) {
        try {
          await fetch(`${serverUrl}/api/cleanup-test-kb`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kb_id: 'connectivity-test' })
          });
        } catch (cleanupError) {
          // Ignore cleanup errors for connectivity test
        }
      }
      
      return { register_schema_available: response.status !== 404 };
    }, options);
    
    // Test 4: Connector Health (if any are running)
    await runTest(suite, 'Connector Services Health', async () => {
      const fetch = (await import('node-fetch')).default;
      const connectors = [
        { name: 'Retail Mock', port: 3001 },
        { name: 'GitHub', port: 3002 },
        { name: 'Slack', port: 3003 },
        { name: 'Confluence', port: 3004 }
      ];
      
      const results = [];
      for (const connector of connectors) {
        try {
          const response = await fetch(`http://localhost:${connector.port}/health`, {
            timeout: 5000
          });
          
          results.push({
            name: connector.name,
            port: connector.port,
            status: response.ok ? 'healthy' : 'unhealthy',
            response_time_ms: response.ok ? 'fast' : 'slow'
          });
        } catch (error) {
          results.push({
            name: connector.name,
            port: connector.port,
            status: 'offline',
            error: 'Connection refused'
          });
        }
      }
      
      const healthyCount = results.filter(r => r.status === 'healthy').length;
      const offlineCount = results.filter(r => r.status === 'offline').length;
      
      if (healthyCount === 0) {
        throw new Error(`All connectors are offline (${offlineCount}/${connectors.length})`);
      }
      
      return {
        healthy_connectors: healthyCount,
        total_connectors: connectors.length,
        offline_connectors: offlineCount,
        details: results
      };
    }, options);
    
    suite.duration_ms = Date.now() - startTime;
    
    if (options.format === 'json') {
      console.log(JSON.stringify(suite, null, 2));
    } else {
      displayTestResults(suite, options);
    }
    
    // Exit with non-zero code if any tests failed
    process.exit(suite.failed > 0 ? 1 : 0);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (options.format === 'json') {
      console.log(JSON.stringify({
        error: errorMessage,
        suite: suite
      }, null, 2));
    } else {
      console.error(chalk.red('Test suite failed:'), errorMessage);
    }
    
    process.exit(1);
  }
}

async function runTest(
  suite: TestSuite,
  testName: string,
  testFn: () => Promise<any>,
  options: TestOptions
): Promise<void> {
  suite.total_tests++;
  const startTime = Date.now();
  
  try {
    if (options.format !== 'json') {
      process.stdout.write(chalk.blue(`  Testing ${testName}... `));
    }
    
    const result = await testFn();
    const duration = Date.now() - startTime;
    
    suite.passed++;
    suite.results.push({
      name: testName,
      status: 'pass',
      duration_ms: duration,
      details: options.verbose ? result : undefined
    });
    
    if (options.format !== 'json') {
      console.log(chalk.green(`✅ PASS (${duration}ms)`));
      
      if (options.verbose && result) {
        console.log(chalk.gray(`     ${JSON.stringify(result, null, 2).replace(/\\n/g, '\\n     ')}`));
      }
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    suite.failed++;
    suite.results.push({
      name: testName,
      status: 'fail',
      duration_ms: duration,
      error: errorMessage
    });
    
    if (options.format !== 'json') {
      console.log(chalk.red(`❌ FAIL (${duration}ms)`));
      console.log(chalk.red(`     Error: ${errorMessage}`));
    }
  }
}

function displayTestResults(suite: TestSuite, options: TestOptions): void {
  console.log(chalk.bold(`\\n📊 Test Results:`));
  console.log(chalk.green(`  ✅ Passed: ${suite.passed}`));
  
  if (suite.failed > 0) {
    console.log(chalk.red(`  ❌ Failed: ${suite.failed}`));
  }
  
  if (suite.skipped > 0) {
    console.log(chalk.yellow(`  ⏭️  Skipped: ${suite.skipped}`));
  }
  
  console.log(chalk.blue(`  ⏱️  Duration: ${suite.duration_ms}ms`));
  
  if (suite.failed > 0) {
    console.log(chalk.red(`\\n❌ Some tests failed. Check the errors above for details.`));
    console.log(chalk.yellow('Common issues:'));
    console.log(chalk.yellow('  • Make sure the orchestrator is running (npm run dev in orchestrator/)'));
    console.log(chalk.yellow('  • Check Neo4j is running (Neo4j Desktop or Docker)'));
    console.log(chalk.yellow('  • Verify server URL is correct'));
  } else {
    console.log(chalk.green(`\\n🎉 All tests passed! Knowledge Graph Brain is healthy.`));
  }
}
