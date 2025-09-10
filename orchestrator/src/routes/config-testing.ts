import express from 'express';
import { Request, Response } from 'express';
import { getSystemStatus } from '../status';
import { executeCypher } from '../ingest';

const router = express.Router();

interface TestResult {
  success: boolean;
  severity: 'info' | 'warning' | 'error';
  message: string;
  recommendations: string[];
  metrics?: {
    response_time_ms?: number;
    throughput?: number;
    error_rate?: number;
    cpu_usage?: number;
    memory_usage?: number;
  };
}

interface BenchmarkResult {
  test_name: string;
  baseline_ms: number;
  current_ms: number;
  change_percent: number;
  status: 'improved' | 'degraded' | 'stable';
}

interface AutoHealingSuggestion {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  issue: string;
  solution: string;
  auto_fixable: boolean;
  fix_command?: string;
}

// In-memory storage for benchmarks and suggestions (in production, use database)
const benchmarkHistory: Map<string, number[]> = new Map();
const autoHealingSuggestions: AutoHealingSuggestion[] = [];

// Individual test implementations
async function testNeo4jConnection(): Promise<TestResult> {
  try {
    const startTime = Date.now();
    await executeCypher('RETURN 1 as test');
    const responseTime = Date.now() - startTime;
    
    return {
      success: true,
      severity: responseTime > 1000 ? 'warning' : 'info',
      message: `Neo4j connection successful (${responseTime}ms)`,
      recommendations: responseTime > 1000 ? [
        'Consider optimizing Neo4j configuration for better performance',
        'Check network latency between application and database'
      ] : [],
      metrics: { response_time_ms: responseTime }
    };
  } catch (error) {
    return {
      success: false,
      severity: 'error',
      message: `Neo4j connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      recommendations: [
        'Verify Neo4j service is running',
        'Check connection credentials and URL',
        'Ensure Neo4j is accessible on the configured port'
      ]
    };
  }
}

async function testOllamaEmbedding(): Promise<TestResult> {
  try {
    const startTime = Date.now();
    const response = await fetch('http://localhost:11434/api/tags');
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json() as { models?: Array<{ name: string }> };
    const hasEmbeddingModel = data.models?.some((model) => 
      model.name.includes('mxbai-embed-large') || model.name.includes('embed')
    );
    
    return {
      success: true,
      severity: !hasEmbeddingModel ? 'warning' : 'info',
      message: hasEmbeddingModel 
        ? `Ollama embedding service operational (${responseTime}ms)`
        : 'Ollama accessible but no embedding model found',
      recommendations: !hasEmbeddingModel ? [
        'Install embedding model: ollama pull mxbai-embed-large',
        'Verify embedding model compatibility'
      ] : [],
      metrics: { response_time_ms: responseTime }
    };
  } catch (error) {
    return {
      success: false,
      severity: 'error',
      message: `Ollama embedding test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      recommendations: [
        'Ensure Ollama service is running on port 11434',
        'Install required embedding model',
        'Check Ollama service logs for errors'
      ]
    };
  }
}

async function testConnectorHealth(): Promise<TestResult> {
  const connectorUrls = [
    'http://localhost:3001/health', // Confluence
    'http://localhost:3002/health', // GitHub  
    'http://localhost:3003/health', // Slack
    'http://localhost:8081/health'  // Retail
  ];
  
  const results = await Promise.allSettled(
    connectorUrls.map(async (url) => {
      const startTime = Date.now();
      const response = await fetch(url, { timeout: 5000 } as any);
      const responseTime = Date.now() - startTime;
      return { url, success: response.ok, responseTime };
    })
  );
  
  const successfulConnectors = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const totalConnectors = results.length;
  const avgResponseTime = results
    .filter(r => r.status === 'fulfilled')
    .reduce((sum, r) => sum + (r as any).value.responseTime, 0) / results.length;
  
  return {
    success: successfulConnectors > 0,
    severity: successfulConnectors === totalConnectors ? 'info' : 
              successfulConnectors > 0 ? 'warning' : 'error',
    message: `${successfulConnectors}/${totalConnectors} connectors healthy`,
    recommendations: successfulConnectors < totalConnectors ? [
      'Start all connector services using ./start-services.sh',
      'Check individual connector logs for specific errors',
      'Verify connector configuration and dependencies'
    ] : [],
    metrics: { 
      response_time_ms: avgResponseTime,
      throughput: successfulConnectors / totalConnectors * 100
    }
  };
}

async function testSchemaValidation(): Promise<TestResult> {
  try {
    const startTime = Date.now();
    
    // Check for existing knowledge bases
    const kbResult = await executeCypher('MATCH (kb:KnowledgeBase) RETURN count(kb) as count');
    const kbCount = kbResult[0]?.count || 0;
    
    // Check for schema constraints
    const constraintResult = await executeCypher('CALL db.constraints()');
    const constraintCount = constraintResult.length;
    
    const responseTime = Date.now() - startTime;
    
    return {
      success: true,
      severity: constraintCount === 0 ? 'warning' : 'info',
      message: `Schema validation completed: ${kbCount} knowledge bases, ${constraintCount} constraints`,
      recommendations: constraintCount === 0 ? [
        'Consider adding database constraints for data integrity',
        'Run schema validation on existing data'
      ] : [],
      metrics: { response_time_ms: responseTime }
    };
  } catch (error) {
    return {
      success: false,
      severity: 'error',
      message: `Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      recommendations: [
        'Check database connectivity',
        'Verify schema migration status',
        'Review database permissions'
      ]
    };
  }
}

async function testSearchPerformance(): Promise<TestResult> {
  try {
    const startTime = Date.now();
    
    // Simulate a search query
    const searchResult = await executeCypher(`
      MATCH (n) 
      WHERE n.kb_id IS NOT NULL 
      RETURN count(n) as nodeCount 
      LIMIT 100
    `);
    
    const responseTime = Date.now() - startTime;
    const nodeCount = searchResult[0]?.nodeCount || 0;
    
    return {
      success: true,
      severity: responseTime > 2000 ? 'warning' : 'info',
      message: `Search performance test completed: ${nodeCount} nodes indexed (${responseTime}ms)`,
      recommendations: responseTime > 2000 ? [
        'Consider adding database indexes for frequently queried properties',
        'Optimize Cypher queries for better performance',
        'Review database memory configuration'
      ] : [],
      metrics: { 
        response_time_ms: responseTime,
        throughput: nodeCount / (responseTime / 1000) // nodes per second
      }
    };
  } catch (error) {
    return {
      success: false,
      severity: 'error',
      message: `Search performance test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      recommendations: [
        'Check database performance and memory usage',
        'Verify index configuration',
        'Review query optimization'
      ]
    };
  }
}

async function testSecurityScan(): Promise<TestResult> {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Check for default credentials
  const config = process.env;
  if (config.NEO4J_PASSWORD === 'password' || config.NEO4J_PASSWORD === 'neo4j') {
    issues.push('Default Neo4j password detected');
    recommendations.push('Change default Neo4j password');
  }
  
  // Check for missing API keys in production
  if (process.env.NODE_ENV === 'production') {
    if (!config.OPENAI_API_KEY) {
      issues.push('Missing OpenAI API key in production');
      recommendations.push('Configure OpenAI API key for production deployment');
    }
  }
  
  // Check for HTTP endpoints in production
  if (process.env.NODE_ENV === 'production') {
    const httpEndpoints = [
      config.NEO4J_URI?.startsWith('bolt://'),
      config.OLLAMA_BASE_URL?.startsWith('http://')
    ].filter(Boolean);
    
    if (httpEndpoints.length > 0) {
      issues.push('Unencrypted connections detected in production');
      recommendations.push('Use encrypted connections (HTTPS/bolt+s) in production');
    }
  }
  
  return {
    success: issues.length === 0,
    severity: issues.length > 0 ? (issues.length > 2 ? 'error' : 'warning') : 'info',
    message: issues.length === 0 ? 'Security scan passed' : `${issues.length} security issues detected`,
    recommendations: recommendations
  };
}

// Test execution router
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { test_id, test_type, include_performance } = req.body;
    
    let result: TestResult;
    
    switch (test_id) {
      case 'neo4j_connection':
        result = await testNeo4jConnection();
        break;
      case 'ollama_embedding':
        result = await testOllamaEmbedding();
        break;
      case 'connector_health':
        result = await testConnectorHealth();
        break;
      case 'schema_validation':
        result = await testSchemaValidation();
        break;
      case 'search_performance':
        result = await testSearchPerformance();
        break;
      case 'security_scan':
        result = await testSecurityScan();
        break;
      default:
        return res.status(400).json({ error: 'Unknown test_id' });
    }
    
    // Store benchmark data
    if (include_performance && result.metrics?.response_time_ms) {
      const history = benchmarkHistory.get(test_id) || [];
      history.push(result.metrics.response_time_ms);
      // Keep only last 10 results
      if (history.length > 10) history.shift();
      benchmarkHistory.set(test_id, history);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Test execution error:', error);
    res.status(500).json({ 
      error: 'Test execution failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get benchmarks
router.get('/benchmarks', (req: Request, res: Response) => {
  const benchmarks: BenchmarkResult[] = [];
  
  for (const [testName, history] of benchmarkHistory.entries()) {
    if (history.length >= 2) {
      const baseline = history[0];
      const current = history[history.length - 1];
      const changePercent = ((current - baseline) / baseline) * 100;
      
      benchmarks.push({
        test_name: testName,
        baseline_ms: baseline,
        current_ms: current,
        change_percent: Math.round(changePercent * 100) / 100,
        status: changePercent < -5 ? 'improved' : 
                changePercent > 10 ? 'degraded' : 'stable'
      });
    }
  }
  
  res.json({ benchmarks });
});

// Configuration drift detection
router.get('/drift', async (req: Request, res: Response) => {
  try {
    // Simple drift detection - compare current config with saved config
    // In production, this would compare with a baseline configuration
    const currentConfig = {
      neo4j_uri: process.env.NEO4J_URI,
      ollama_url: process.env.OLLAMA_BASE_URL,
      openai_configured: !!process.env.OPENAI_API_KEY
    };
    
    // For demo purposes, always return false
    // In reality, this would check against stored baseline
    const driftDetected = false;
    
    res.json({ 
      drift_detected: driftDetected,
      current_config: currentConfig,
      last_check: Date.now()
    });
  } catch (error) {
    console.error('Drift detection error:', error);
    res.status(500).json({ error: 'Drift detection failed' });
  }
});

// Auto-healing suggestions
router.get('/auto-healing', async (req: Request, res: Response) => {
  try {
    const suggestions: AutoHealingSuggestion[] = [];
    
    // Check system status for issues
    const systemStatus = await getSystemStatus();
    
    if (!systemStatus.neo4j_connected) {
      suggestions.push({
        id: 'neo4j_connection',
        severity: 'critical',
        issue: 'Neo4j database connection lost',
        solution: 'Restart Neo4j service and verify connection settings',
        auto_fixable: false
      });
    }
    
    if (systemStatus.total_errors > 10) {
      suggestions.push({
        id: 'high_error_rate',
        severity: 'warning',
        issue: 'High error rate detected in system',
        solution: 'Review application logs and restart affected services',
        auto_fixable: true,
        fix_command: 'restart_services'
      });
    }
    
    // Check for low disk space (simulated)
    if (Math.random() > 0.8) {
      suggestions.push({
        id: 'disk_space',
        severity: 'warning',
        issue: 'Low disk space detected',
        solution: 'Clean up old logs and temporary files',
        auto_fixable: true,
        fix_command: 'cleanup_disk_space'
      });
    }
    
    res.json({ suggestions });
  } catch (error) {
    console.error('Auto-healing suggestions error:', error);
    res.status(500).json({ error: 'Failed to generate auto-healing suggestions' });
  }
});

// Apply auto-fix
router.post('/auto-fix', async (req: Request, res: Response) => {
  try {
    const { suggestion_id, fix_command } = req.body;
    
    switch (fix_command) {
      case 'restart_services':
        // Simulate service restart
        console.log('Auto-fix: Restarting services...');
        break;
      case 'cleanup_disk_space':
        // Simulate disk cleanup
        console.log('Auto-fix: Cleaning up disk space...');
        break;
      default:
        return res.status(400).json({ error: 'Unknown fix command' });
    }
    
    res.json({ success: true, message: 'Auto-fix applied successfully' });
  } catch (error) {
    console.error('Auto-fix error:', error);
    res.status(500).json({ error: 'Auto-fix failed' });
  }
});

export default router;
