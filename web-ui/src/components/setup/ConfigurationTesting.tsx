import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Zap, Clock, TrendingUp, Shield, Settings, Play, Pause } from 'lucide-react';

interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'warning';
  duration_ms?: number;
  message?: string;
  recommendations?: string[];
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

export function ConfigurationTesting() {
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[]>([]);
  const [autoHealingSuggestions, setAutoHealingSuggestions] = useState<AutoHealingSuggestion[]>([]);
  const [testSuite, setTestSuite] = useState<'comprehensive' | 'quick' | 'performance' | 'security'>('comprehensive');
  const [isRunning, setIsRunning] = useState(false);
  const [configurationDrift, setConfigurationDrift] = useState<boolean>(false);

  const testSuites = {
    comprehensive: [
      { id: 'neo4j_connection', name: 'Neo4j Connection & Performance', category: 'connectivity' },
      { id: 'ollama_embedding', name: 'Ollama Embedding Service', category: 'ai' },
      { id: 'openai_api', name: 'OpenAI API Integration', category: 'ai' },
      { id: 'connector_health', name: 'Data Connector Health', category: 'connectors' },
      { id: 'schema_validation', name: 'Schema Validation & Integrity', category: 'data' },
      { id: 'ingestion_pipeline', name: 'Data Ingestion Pipeline', category: 'data' },
      { id: 'search_performance', name: 'Search Performance & Accuracy', category: 'performance' },
      { id: 'api_endpoints', name: 'API Endpoint Validation', category: 'api' },
      { id: 'security_scan', name: 'Security Configuration Scan', category: 'security' },
      { id: 'resource_limits', name: 'Resource Usage & Limits', category: 'performance' }
    ],
    quick: [
      { id: 'basic_connectivity', name: 'Basic Service Connectivity', category: 'connectivity' },
      { id: 'health_checks', name: 'Service Health Checks', category: 'health' },
      { id: 'config_validation', name: 'Configuration Validation', category: 'config' }
    ],
    performance: [
      { id: 'throughput_test', name: 'Query Throughput Test', category: 'performance' },
      { id: 'latency_benchmark', name: 'API Latency Benchmark', category: 'performance' },
      { id: 'concurrent_users', name: 'Concurrent User Load Test', category: 'performance' },
      { id: 'memory_stress', name: 'Memory Usage Under Load', category: 'performance' }
    ],
    security: [
      { id: 'auth_validation', name: 'Authentication & Authorization', category: 'security' },
      { id: 'data_encryption', name: 'Data Encryption Validation', category: 'security' },
      { id: 'api_security', name: 'API Security Headers', category: 'security' },
      { id: 'credential_security', name: 'Credential Security Check', category: 'security' }
    ]
  };

  useEffect(() => {
    checkConfigurationDrift();
    loadHistoricalBenchmarks();
    generateAutoHealingSuggestions();
  }, []);

  const checkConfigurationDrift = async () => {
    try {
      const response = await fetch('/api/config/drift');
      const data = await response.json();
      setConfigurationDrift(data.drift_detected);
    } catch (error) {
      console.error('Error checking configuration drift:', error);
    }
  };

  const loadHistoricalBenchmarks = async () => {
    try {
      const response = await fetch('/api/config/benchmarks');
      const data = await response.json();
      setBenchmarkResults(data.benchmarks || []);
    } catch (error) {
      console.error('Error loading benchmarks:', error);
    }
  };

  const generateAutoHealingSuggestions = async () => {
    try {
      const response = await fetch('/api/config/auto-healing');
      const data = await response.json();
      setAutoHealingSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error loading auto-healing suggestions:', error);
    }
  };

  const runTestSuite = async () => {
    setIsRunning(true);
    const tests = testSuites[testSuite];
    setTestResults(tests.map(test => ({ ...test, status: 'pending' })));

    for (const test of tests) {
      setActiveTest(test.id);
      setTestResults(prev => 
        prev.map(t => t.id === test.id ? { ...t, status: 'running' } : t)
      );

      try {
        const startTime = Date.now();
        const response = await fetch('/api/config/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            test_id: test.id, 
            test_type: testSuite,
            include_performance: true 
          })
        });
        
        const result = await response.json();
        const duration = Date.now() - startTime;

        setTestResults(prev => 
          prev.map(t => t.id === test.id ? {
            ...t,
            status: result.success ? 'passed' : result.severity === 'warning' ? 'warning' : 'failed',
            duration_ms: duration,
            message: result.message,
            recommendations: result.recommendations,
            metrics: result.metrics
          } : t)
        );
      } catch (error) {
        setTestResults(prev => 
          prev.map(t => t.id === test.id ? {
            ...t,
            status: 'failed',
            message: `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          } : t)
        );
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setActiveTest(null);
    setIsRunning(false);
    
    // Generate new auto-healing suggestions after tests
    await generateAutoHealingSuggestions();
  };

  const applyAutoFix = async (suggestion: AutoHealingSuggestion) => {
    if (!suggestion.auto_fixable || !suggestion.fix_command) return;

    try {
      const response = await fetch('/api/config/auto-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          suggestion_id: suggestion.id,
          fix_command: suggestion.fix_command 
        })
      });

      if (response.ok) {
        setAutoHealingSuggestions(prev => 
          prev.filter(s => s.id !== suggestion.id)
        );
        // Re-run tests to validate fix
        await runTestSuite();
      }
    } catch (error) {
      console.error('Error applying auto-fix:', error);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getSeverityIcon = (severity: AutoHealingSuggestion['severity']) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Shield className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuration Testing & Validation</h1>
          <p className="text-gray-600">Comprehensive testing, performance benchmarking, and auto-healing suggestions</p>
        </div>
        <div className="flex items-center space-x-3">
          {configurationDrift && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-md">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Configuration Drift Detected</span>
            </div>
          )}
          <button
            onClick={runTestSuite}
            disabled={isRunning}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isRunning ? 'Running Tests...' : 'Run Tests'}</span>
          </button>
        </div>
      </div>

      {/* Test Suite Selector */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Suite Selection</h2>
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(testSuites).map(([key, tests]) => (
            <button
              key={key}
              onClick={() => setTestSuite(key as any)}
              className={`p-4 rounded-lg border-2 transition-colors ${
                testSuite === key
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium capitalize">{key} Suite</div>
              <div className="text-sm text-gray-600">{tests.length} tests</div>
            </button>
          ))}
        </div>
      </div>

      {/* Test Results */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Results</h2>
        
        {testResults.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Settings className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>Select a test suite and run tests to see results</p>
          </div>
        ) : (
          <div className="space-y-3">
            {testResults.map((test) => (
              <div
                key={test.id}
                className={`p-4 border rounded-lg transition-colors ${
                  activeTest === test.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(test.status)}
                    <div>
                      <div className="font-medium">{test.name}</div>
                      {test.message && (
                        <div className="text-sm text-gray-600">{test.message}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    {test.duration_ms && (
                      <span>{test.duration_ms}ms</span>
                    )}
                    {test.metrics?.response_time_ms && (
                      <span>RT: {test.metrics.response_time_ms}ms</span>
                    )}
                  </div>
                </div>
                
                {test.recommendations && test.recommendations.length > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <div className="text-sm font-medium text-gray-900 mb-2">Recommendations:</div>
                    <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                      {test.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Performance Benchmarks */}
      {benchmarkResults.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Performance Benchmarks
          </h2>
          <div className="space-y-3">
            {benchmarkResults.map((benchmark, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="font-medium">{benchmark.test_name}</div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    {benchmark.baseline_ms}ms → {benchmark.current_ms}ms
                  </span>
                  <span className={`text-sm font-medium ${
                    benchmark.status === 'improved' ? 'text-green-600' :
                    benchmark.status === 'degraded' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {benchmark.change_percent > 0 ? '+' : ''}{benchmark.change_percent}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auto-Healing Suggestions */}
      {autoHealingSuggestions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            Auto-Healing Suggestions
          </h2>
          <div className="space-y-4">
            {autoHealingSuggestions.map((suggestion) => (
              <div key={suggestion.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getSeverityIcon(suggestion.severity)}
                    <div>
                      <div className="font-medium text-gray-900">{suggestion.issue}</div>
                      <div className="text-sm text-gray-600 mt-1">{suggestion.solution}</div>
                    </div>
                  </div>
                  {suggestion.auto_fixable && (
                    <button
                      onClick={() => applyAutoFix(suggestion)}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                    >
                      Auto-Fix
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
