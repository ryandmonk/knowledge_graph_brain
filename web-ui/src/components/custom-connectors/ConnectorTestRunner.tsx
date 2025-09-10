import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Square, CheckCircle, XCircle, Clock, AlertTriangle, Download } from 'lucide-react';

interface TestStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  output?: string;
  error?: string;
  warnings?: string[];
}

interface TestSuite {
  id: string;
  name: string;
  description: string;
  steps: TestStep[];
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
}

interface ConnectorTestRunnerProps {
  connectorId: string;
  onTestComplete: (results: TestSuite[]) => void;
  onClose: () => void;
}

const SAMPLE_TEST_SUITES: TestSuite[] = [
  {
    id: 'connection',
    name: 'Connection Tests',
    description: 'Verify connectivity and authentication',
    status: 'pending',
    steps: [
      {
        id: 'ping',
        name: 'Network Connectivity',
        description: 'Test if the API endpoint is reachable',
        status: 'pending'
      },
      {
        id: 'auth',
        name: 'Authentication',
        description: 'Verify API credentials and permissions',
        status: 'pending'
      },
      {
        id: 'rate-limit',
        name: 'Rate Limiting',
        description: 'Check API rate limit configurations',
        status: 'pending'
      }
    ]
  },
  {
    id: 'schema',
    name: 'Schema Validation',
    description: 'Validate data schema and mappings',
    status: 'pending',
    steps: [
      {
        id: 'schema-syntax',
        name: 'Schema Syntax',
        description: 'Verify schema JSON is valid',
        status: 'pending'
      },
      {
        id: 'field-mapping',
        name: 'Field Mappings',
        description: 'Test all field mapping configurations',
        status: 'pending'
      },
      {
        id: 'data-types',
        name: 'Data Type Validation',
        description: 'Ensure data types match schema definitions',
        status: 'pending'
      }
    ]
  },
  {
    id: 'ingestion',
    name: 'Data Ingestion',
    description: 'Test actual data retrieval and processing',
    status: 'pending',
    steps: [
      {
        id: 'sample-fetch',
        name: 'Sample Data Fetch',
        description: 'Retrieve a small sample of data',
        status: 'pending'
      },
      {
        id: 'data-processing',
        name: 'Data Processing',
        description: 'Process and transform the sample data',
        status: 'pending'
      },
      {
        id: 'graph-insertion',
        name: 'Graph Insertion',
        description: 'Insert processed data into knowledge graph',
        status: 'pending'
      }
    ]
  }
];

export default function ConnectorTestRunner({ 
  connectorId, 
  onTestComplete, 
  onClose 
}: ConnectorTestRunnerProps) {
  const [testSuites, setTestSuites] = useState<TestSuite[]>(SAMPLE_TEST_SUITES);
  const [isRunning, setIsRunning] = useState(false);
  const [currentSuiteIndex, setCurrentSuiteIndex] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [testOutput, setTestOutput] = useState<string[]>([]);
  const [showOutput, setShowOutput] = useState(true);
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [testOutput]);

  const addOutput = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestOutput(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const updateTestStep = (suiteId: string, stepId: string, updates: Partial<TestStep>) => {
    setTestSuites(prev => prev.map(suite => 
      suite.id === suiteId 
        ? {
            ...suite,
            steps: suite.steps.map(step => 
              step.id === stepId ? { ...step, ...updates } : step
            )
          }
        : suite
    ));
  };

  const updateTestSuite = (suiteId: string, updates: Partial<TestSuite>) => {
    setTestSuites(prev => prev.map(suite => 
      suite.id === suiteId ? { ...suite, ...updates } : suite
    ));
  };

  const simulateStep = async (suite: TestSuite, step: TestStep): Promise<void> => {
    const startTime = new Date();
    
    updateTestStep(suite.id, step.id, { 
      status: 'running', 
      startTime,
      output: '',
      error: undefined 
    });

    addOutput(`Starting ${step.name}...`);

    // Simulate test execution with random delay and outcomes
    const delay = Math.random() * 2000 + 1000; // 1-3 seconds
    await new Promise(resolve => setTimeout(resolve, delay));

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    // Simulate different outcomes
    const success = Math.random() > 0.2; // 80% success rate
    
    if (success) {
      updateTestStep(suite.id, step.id, { 
        status: 'success', 
        endTime,
        duration,
        output: `${step.name} completed successfully`
      });
      addOutput(`✅ ${step.name} completed successfully (${duration}ms)`);
    } else {
      const error = `Simulated error in ${step.name}`;
      updateTestStep(suite.id, step.id, { 
        status: 'error', 
        endTime,
        duration,
        error
      });
      addOutput(`❌ ${step.name} failed: ${error}`);
    }
  };

  const runTests = async () => {
    setIsRunning(true);
    addOutput('🚀 Starting connector tests...');

    for (let suiteIndex = 0; suiteIndex < testSuites.length; suiteIndex++) {
      const suite = testSuites[suiteIndex];
      setCurrentSuiteIndex(suiteIndex);
      
      const suiteStartTime = new Date();
      updateTestSuite(suite.id, { status: 'running', startTime: suiteStartTime });
      addOutput(`📋 Running test suite: ${suite.name}`);

      let suiteSuccess = true;

      for (let stepIndex = 0; stepIndex < suite.steps.length; stepIndex++) {
        if (!isRunning) break; // Check if cancelled
        
        const step = suite.steps[stepIndex];
        setCurrentStepIndex(stepIndex);
        
        try {
          await simulateStep(suite, step);
          
          // Check if step failed
          const updatedSuite = testSuites.find(s => s.id === suite.id);
          const updatedStep = updatedSuite?.steps.find(s => s.id === step.id);
          if (updatedStep?.status === 'error') {
            suiteSuccess = false;
          }
        } catch (error) {
          suiteSuccess = false;
          addOutput(`💥 Test step crashed: ${error}`);
        }
      }

      const suiteEndTime = new Date();
      const suiteDuration = suiteEndTime.getTime() - suiteStartTime.getTime();
      
      updateTestSuite(suite.id, { 
        status: suiteSuccess ? 'success' : 'error',
        endTime: suiteEndTime,
        duration: suiteDuration
      });

      addOutput(`${suiteSuccess ? '✅' : '❌'} Test suite ${suite.name} ${suiteSuccess ? 'completed' : 'failed'} (${suiteDuration}ms)`);
    }

    if (isRunning) {
      addOutput('🏁 All tests completed!');
      onTestComplete(testSuites);
    }

    setIsRunning(false);
    setCurrentSuiteIndex(0);
    setCurrentStepIndex(0);
  };

  const stopTests = () => {
    setIsRunning(false);
    addOutput('⏹️ Tests cancelled by user');
    
    // Mark running tests as cancelled
    setTestSuites(prev => prev.map(suite => ({
      ...suite,
      status: suite.status === 'running' ? 'cancelled' : suite.status,
      steps: suite.steps.map(step => ({
        ...step,
        status: step.status === 'running' ? 'skipped' : step.status
      }))
    })));
  };

  const resetTests = () => {
    setTestSuites(SAMPLE_TEST_SUITES.map(suite => ({
      ...suite,
      status: 'pending',
      startTime: undefined,
      endTime: undefined,
      duration: undefined,
      steps: suite.steps.map(step => ({
        ...step,
        status: 'pending',
        startTime: undefined,
        endTime: undefined,
        duration: undefined,
        output: undefined,
        error: undefined,
        warnings: undefined
      }))
    })));
    setTestOutput([]);
    setCurrentSuiteIndex(0);
    setCurrentStepIndex(0);
  };

  const downloadResults = () => {
    const results = {
      connectorId,
      timestamp: new Date().toISOString(),
      testSuites: testSuites,
      output: testOutput
    };

    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `connector-test-results-${connectorId}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: TestStep['status'] | 'cancelled') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>;
      case 'skipped':
      case 'cancelled':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TestStep['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'running':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'skipped':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Connector Test Runner</h2>
              <p className="text-gray-600">Testing connector: {connectorId}</p>
            </div>
            
            <div className="flex items-center space-x-3">
              {!isRunning ? (
                <>
                  <button
                    onClick={runTests}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Play className="w-4 h-4" />
                    <span>Run Tests</span>
                  </button>
                  <button
                    onClick={resetTests}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    <Square className="w-4 h-4" />
                    <span>Reset</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={stopTests}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Pause className="w-4 h-4" />
                  <span>Stop</span>
                </button>
              )}
              
              <button
                onClick={downloadResults}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Test Suites */}
          <div className="w-1/2 border-r border-gray-200 flex flex-col">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Test Suites</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {testSuites.map((suite, suiteIndex) => (
                <div
                  key={suite.id}
                  className={`border rounded-lg p-4 ${
                    suiteIndex === currentSuiteIndex && isRunning
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(suite.status)}
                      <h4 className="font-medium text-gray-900">{suite.name}</h4>
                    </div>
                    {suite.duration && (
                      <span className="text-sm text-gray-500">{suite.duration}ms</span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{suite.description}</p>
                  
                  <div className="space-y-2">
                    {suite.steps.map((step, stepIndex) => (
                      <div
                        key={step.id}
                        className={`p-3 rounded border ${getStatusColor(step.status)} ${
                          suiteIndex === currentSuiteIndex && stepIndex === currentStepIndex && isRunning
                            ? 'ring-2 ring-blue-300'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(step.status)}
                            <span className="text-sm font-medium">{step.name}</span>
                          </div>
                          {step.duration && (
                            <span className="text-xs">{step.duration}ms</span>
                          )}
                        </div>
                        {step.error && (
                          <p className="text-xs text-red-600 mt-1">{step.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Test Output */}
          <div className="w-1/2 flex flex-col">
            <div className="bg-gray-900 text-white px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-medium">Test Output</h3>
              <button
                onClick={() => setShowOutput(!showOutput)}
                className="text-gray-300 hover:text-white"
              >
                {showOutput ? 'Hide' : 'Show'}
              </button>
            </div>
            
            {showOutput && (
              <div
                ref={outputRef}
                className="flex-1 overflow-y-auto bg-gray-900 text-green-400 p-4 font-mono text-sm"
              >
                {testOutput.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    No output yet. Click "Run Tests" to start.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {testOutput.map((line, index) => (
                      <div key={index} className="whitespace-pre-wrap">
                        {line}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              {isRunning ? (
                <span>Running tests... (Suite {currentSuiteIndex + 1} of {testSuites.length})</span>
              ) : (
                <span>
                  Tests: {testSuites.filter(s => s.status === 'success').length} passed, 
                  {' '}{testSuites.filter(s => s.status === 'error').length} failed, 
                  {' '}{testSuites.filter(s => s.status === 'pending').length} pending
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
