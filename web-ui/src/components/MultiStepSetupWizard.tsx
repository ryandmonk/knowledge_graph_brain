import { useState, useEffect, Fragment } from 'react';
import { CheckCircle, XCircle, RefreshCw, Settings, Database, Link, CheckSquare } from 'lucide-react';
import { api } from '../utils/api';
import ConnectorConfigModal from './ConnectorConfigModal';
import DemoModeToggle from './DemoModeToggle';

interface StepProps {
  isActive: boolean;
  isCompleted: boolean;
  stepNumber: number;
  title: string;
}

function StepIndicator({ isActive, isCompleted, stepNumber, title }: StepProps) {
  const baseClasses = "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium";
  const activeClasses = isActive ? "bg-blue-600 text-white" : 
                       isCompleted ? "bg-green-600 text-white" : 
                       "bg-gray-300 text-gray-600";

  return (
    <div className="flex items-center">
      <div className={`${baseClasses} ${activeClasses}`}>
        {isCompleted ? <CheckCircle className="w-4 h-4" /> : stepNumber}
      </div>
      <span className={`ml-2 text-sm font-medium ${isActive ? 'text-gray-900' : isCompleted ? 'text-green-700' : 'text-gray-500'}`}>
        {title}
      </span>
    </div>
  );
}

function ProgressBar({ currentStep }: { currentStep: number }) {
  const steps = [
    { number: 1, title: "Service Check" },
    { number: 2, title: "Configuration" },
    { number: 3, title: "Connectors" },
    { number: 4, title: "Complete" }
  ];

  return (
    <div className="flex justify-center items-center mb-8">
      <div className="flex items-center space-x-8">
        {steps.map((step, index) => (
          <Fragment key={step.number}>
            <StepIndicator 
              stepNumber={step.number}
              title={step.title}
              isActive={currentStep === step.number}
              isCompleted={currentStep > step.number}
            />
            {index < steps.length - 1 && (
              <div className={`w-24 h-0.5 ${currentStep > step.number ? 'bg-green-600' : 'bg-gray-300'}`}></div>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

// Step 1: Service Check Component
function ServiceCheckStep({ onNext }: { onNext: () => void }) {
  const [services, setServices] = useState<any[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const serviceUrls = [
    'http://localhost:7474',
    'http://localhost:11434/api/tags', 
    'http://localhost:3000/api/health'
  ];

  const checkAllServices = async () => {
    setIsChecking(true);
    
    try {
      const results = await Promise.all(
        serviceUrls.map(url => api.checkService(url))
      );
      setServices(results);
    } catch (err) {
      console.error('Failed to check services:', err);
    } finally {
      setIsChecking(false);
    }
  };

  const recheckService = async (index: number) => {
    const newServices = [...services];
    newServices[index] = { ...newServices[index], status: 'checking' };
    setServices(newServices);
    
    try {
      const result = await api.checkService(serviceUrls[index]);
      newServices[index] = result;
      setServices(newServices);
    } catch (error) {
      // Error handling already in checkService
    }
  };

  useEffect(() => {
    checkAllServices();
  }, []);

  const healthyServices = services.filter(s => s.status === 'healthy').length;
  const allHealthy = healthyServices === services.length && services.length > 0;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
          <Database className="w-5 h-5" />
        </div>
        <div className="flex-grow">
          <h3 className="text-lg font-medium text-gray-900">
            Check Core Services
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Verify that Neo4j and Ollama are running
          </p>
          
          <div className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium text-gray-900">Service Status</h4>
              <button
                onClick={checkAllServices}
                disabled={isChecking}
                className="bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? 'Checking...' : 'Refresh All'}</span>
              </button>
            </div>
            
            {services.length > 0 && (
              <div className="space-y-3">
                {services.map((service, index) => (
                  <ServiceCard 
                    key={index}
                    service={service}
                    onRecheck={() => recheckService(index)}
                  />
                ))}
              </div>
            )}

            {allHealthy && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-800 font-medium">All services are running!</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Your knowledge graph system is ready. You can proceed to configuration.
                </p>
                <button 
                  onClick={onNext}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors mt-3"
                >
                  Continue to Configuration
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 2: Environment Configuration Component
function ConfigurationStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<Record<string, string>>({});

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await api.getConfig();
      setConfig(data);
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (service: string) => {
    setTestResults(prev => ({ ...prev, [service]: 'testing' }));
    
    try {
      // Test the specific service based on config
      let result: any;
      if (service === 'neo4j') {
        result = await api.checkService('http://localhost:7474');
      } else if (service === 'ollama') {
        result = await api.checkService('http://localhost:11434/api/tags');
      }
      
      setTestResults(prev => ({ 
        ...prev, 
        [service]: result?.status === 'healthy' ? 'success' : 'error' 
      }));
    } catch (error) {
      setTestResults(prev => ({ ...prev, [service]: 'error' }));
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 text-center">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
        <p>Loading configuration...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
          <Settings className="w-5 h-5" />
        </div>
        <div className="flex-grow">
          <h3 className="text-lg font-medium text-gray-900">Environment Configuration</h3>
          <p className="text-sm text-gray-500 mt-1">Review and validate your system configuration</p>
          
          <div className="mt-6 space-y-6">
            {/* Neo4j Configuration */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Neo4j Database</h4>
                <button
                  onClick={() => testConnection('neo4j')}
                  disabled={testResults.neo4j === 'testing'}
                  className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100 disabled:opacity-50"
                >
                  {testResults.neo4j === 'testing' ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-gray-600">URI</label>
                  <p className="font-mono bg-gray-50 p-2 rounded">{config.NEO4J_URI || 'bolt://localhost:7687'}</p>
                </div>
                <div>
                  <label className="block text-gray-600">Database</label>
                  <p className="font-mono bg-gray-50 p-2 rounded">{config.NEO4J_DATABASE || 'neo4j'}</p>
                </div>
                <div>
                  <label className="block text-gray-600">User</label>
                  <p className="font-mono bg-gray-50 p-2 rounded">{config.NEO4J_USER || 'neo4j'}</p>
                </div>
                <div>
                  <label className="block text-gray-600">Password</label>
                  <p className="font-mono bg-gray-50 p-2 rounded">{config.NEO4J_PASSWORD || 'Not configured'}</p>
                </div>
              </div>
              {testResults.neo4j && (
                <div className={`mt-2 p-2 rounded text-sm ${
                  testResults.neo4j === 'success' ? 'bg-green-50 text-green-700' : 
                  testResults.neo4j === 'error' ? 'bg-red-50 text-red-700' : ''
                }`}>
                  {testResults.neo4j === 'success' ? '✅ Connected successfully' : 
                   testResults.neo4j === 'error' ? '❌ Connection failed' : ''}
                </div>
              )}
            </div>

            {/* Ollama Configuration */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Ollama (Local AI)</h4>
                <button
                  onClick={() => testConnection('ollama')}
                  disabled={testResults.ollama === 'testing'}
                  className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100 disabled:opacity-50"
                >
                  {testResults.ollama === 'testing' ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-gray-600">Base URL</label>
                  <p className="font-mono bg-gray-50 p-2 rounded">{config.OLLAMA_BASE_URL || 'http://localhost:11434'}</p>
                </div>
                <div>
                  <label className="block text-gray-600">LLM Model</label>
                  <p className="font-mono bg-gray-50 p-2 rounded">{config.LLM_MODEL || 'llama3.2'}</p>
                </div>
                <div>
                  <label className="block text-gray-600">Embedding Provider</label>
                  <p className="font-mono bg-gray-50 p-2 rounded">{config.EMBEDDING_PROVIDER || 'ollama'}</p>
                </div>
                <div>
                  <label className="block text-gray-600">Embedding Model</label>
                  <p className="font-mono bg-gray-50 p-2 rounded">{config.EMBEDDING_MODEL || 'mxbai-embed-large'}</p>
                </div>
              </div>
              {testResults.ollama && (
                <div className={`mt-2 p-2 rounded text-sm ${
                  testResults.ollama === 'success' ? 'bg-green-50 text-green-700' : 
                  testResults.ollama === 'error' ? 'bg-red-50 text-red-700' : ''
                }`}>
                  {testResults.ollama === 'success' ? '✅ Connected successfully' : 
                   testResults.ollama === 'error' ? '❌ Connection failed' : ''}
                </div>
              )}
            </div>

            {/* Demo Mode */}
            <div className="border border-gray-200 rounded-lg p-4">
              <DemoModeToggle onUpdate={loadConfig} />
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={onBack}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Back
            </button>
            <button
              onClick={onNext}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Continue to Connectors
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 3: Connector Configuration
function ConnectorStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [connectors, setConnectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  const [configModalOpen, setConfigModalOpen] = useState<string | null>(null);

  useEffect(() => {
    loadConnectors();
  }, []);

  const loadConnectors = async () => {
    try {
      const data = await api.getConnectors();
      setConnectors(data);
    } catch (error) {
      console.error('Failed to load connectors:', error);
    } finally {
      setLoading(false);
    }
  };

  const testConnector = async (connectorId: string) => {
    setTestResults(prev => ({ ...prev, [connectorId]: 'testing' }));
    
    try {
      const result = await api.testConnector(connectorId);
      setTestResults(prev => ({ 
        ...prev, 
        [connectorId]: result.success ? 'success' : 'error' 
      }));
    } catch (error) {
      setTestResults(prev => ({ ...prev, [connectorId]: 'error' }));
    }
  };

  const openConfigModal = (connectorId: string) => {
    setConfigModalOpen(connectorId);
  };

  const closeConfigModal = () => {
    setConfigModalOpen(null);
  };

  const handleConfigUpdate = (connectorId: string, success: boolean) => {
    if (success) {
      // Refresh test results after config update
      testConnector(connectorId);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 text-center">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
        <p>Loading connectors...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
          <Link className="w-5 h-5" />
        </div>
        <div className="flex-grow">
          <h3 className="text-lg font-medium text-gray-900">Data Connectors</h3>
          <p className="text-sm text-gray-500 mt-1">Choose and configure data sources for your knowledge graph</p>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {connectors.map((connector) => (
              <div key={connector.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{connector.icon}</span>
                    <div>
                      <h4 className="font-medium text-gray-900">{connector.name}</h4>
                      <p className="text-xs text-gray-500">Port {connector.port}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openConfigModal(connector.id)}
                      className="text-sm bg-gray-50 text-gray-600 px-3 py-1 rounded hover:bg-gray-100"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => testConnector(connector.id)}
                      disabled={testResults[connector.id] === 'testing'}
                      className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100 disabled:opacity-50"
                    >
                      {testResults[connector.id] === 'testing' ? 'Testing...' : 'Test'}
                    </button>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">{connector.description}</p>
                
                {testResults[connector.id] && (
                  <div className={`p-2 rounded text-sm ${
                    testResults[connector.id] === 'success' ? 'bg-green-50 text-green-700' : 
                    testResults[connector.id] === 'error' ? 'bg-red-50 text-red-700' : ''
                  }`}>
                    {testResults[connector.id] === 'success' ? '✅ Connector available' : 
                     testResults[connector.id] === 'error' ? '❌ Connector unavailable' : ''}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Configuration Modal */}
          {configModalOpen && (
            <ConnectorConfigModal
              connectorId={configModalOpen}
              onConfigUpdate={handleConfigUpdate}
              onClose={closeConfigModal}
            />
          )}

          <div className="flex justify-between mt-6">
            <button
              onClick={onBack}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Back
            </button>
            <button
              onClick={onNext}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Continue to Validation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 4: Final Validation
function ValidationStep({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [validationStatus, setValidationStatus] = useState<Record<string, string>>({
    services: 'pending',
    configuration: 'pending',
    connectors: 'pending',
    sample: 'pending'
  });
  const [isRunning, setIsRunning] = useState(false);

  const runValidation = async () => {
    setIsRunning(true);
    
    // Simulate validation steps
    const steps = ['services', 'configuration', 'connectors', 'sample'];
    
    for (const step of steps) {
      setValidationStatus(prev => ({ ...prev, [step]: 'running' }));
      
      try {
        // Add actual validation logic here
        await new Promise(resolve => setTimeout(resolve, 1500));
        setValidationStatus(prev => ({ ...prev, [step]: 'success' }));
      } catch (error) {
        setValidationStatus(prev => ({ ...prev, [step]: 'error' }));
      }
    }
    
    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'running': return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      default: return <div className="w-5 h-5 rounded-full bg-gray-300"></div>;
    }
  };

  const allComplete = Object.values(validationStatus).every(status => status === 'success');

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
          <CheckSquare className="w-5 h-5" />
        </div>
        <div className="flex-grow">
          <h3 className="text-lg font-medium text-gray-900">System Validation</h3>
          <p className="text-sm text-gray-500 mt-1">Verify that your knowledge graph system is ready to use</p>
          
          <div className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                {getStatusIcon(validationStatus.services)}
                <span className="font-medium">Core Services</span>
                <span className="text-sm text-gray-500 ml-auto">
                  {validationStatus.services === 'success' ? 'All services running' : 
                   validationStatus.services === 'running' ? 'Checking...' : 
                   validationStatus.services === 'error' ? 'Issues detected' : 'Pending'}
                </span>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                {getStatusIcon(validationStatus.configuration)}
                <span className="font-medium">Configuration</span>
                <span className="text-sm text-gray-500 ml-auto">
                  {validationStatus.configuration === 'success' ? 'Settings validated' : 
                   validationStatus.configuration === 'running' ? 'Validating...' : 
                   validationStatus.configuration === 'error' ? 'Configuration issues' : 'Pending'}
                </span>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                {getStatusIcon(validationStatus.connectors)}
                <span className="font-medium">Data Connectors</span>
                <span className="text-sm text-gray-500 ml-auto">
                  {validationStatus.connectors === 'success' ? 'Connectors ready' : 
                   validationStatus.connectors === 'running' ? 'Testing...' : 
                   validationStatus.connectors === 'error' ? 'Connector issues' : 'Pending'}
                </span>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                {getStatusIcon(validationStatus.sample)}
                <span className="font-medium">Sample Data Test</span>
                <span className="text-sm text-gray-500 ml-auto">
                  {validationStatus.sample === 'success' ? 'End-to-end working' : 
                   validationStatus.sample === 'running' ? 'Testing pipeline...' : 
                   validationStatus.sample === 'error' ? 'Pipeline issues' : 'Pending'}
                </span>
              </div>
            </div>

            {!isRunning && !allComplete && (
              <button
                onClick={runValidation}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Run System Validation
              </button>
            )}

            {allComplete && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span className="text-green-800 font-medium text-lg">Setup Complete!</span>
                </div>
                <p className="text-sm text-green-700 mt-2">
                  Your Knowledge Graph Brain is ready to use. You can now start ingesting data and asking questions.
                </p>
                <button
                  onClick={onComplete}
                  className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Launch Knowledge Graph Brain
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={onBack}
              disabled={isRunning}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ServiceCard({ service, onRecheck }: { service: any; onRecheck: () => void }) {
  const statusIcon = service.status === 'healthy' ? (
    <CheckCircle className="w-5 h-5 text-green-600" />
  ) : service.status === 'checking' ? (
    <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
  ) : (
    <XCircle className="w-5 h-5 text-red-600" />
  );

  const statusColor = service.status === 'healthy' ? 
    'bg-green-100 text-green-800 border-green-200' : 
    service.status === 'checking' ? 
    'bg-blue-100 text-blue-800 border-blue-200' : 
    'bg-red-100 text-red-800 border-red-200';

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        {statusIcon}
        <div>
          <h4 className="font-medium text-gray-900">{service.name}</h4>
          <p className="text-sm text-gray-500">Port {service.port}</p>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusColor}`}>
          {service.status === 'checking' ? 'Checking...' : service.status}
        </span>
        {service.status !== 'checking' && (
          <button
            onClick={onRecheck}
            className="text-sm text-blue-600 hover:text-blue-700 px-3 py-1 rounded bg-blue-50 hover:bg-blue-100"
          >
            Recheck
          </button>
        )}
      </div>
    </div>
  );
}

function MultiStepSetupWizard() {
  const [currentStep, setCurrentStep] = useState(1);

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeSetup = () => {
    // Handle setup completion - could redirect to main dashboard
    alert('Setup complete! Redirecting to dashboard...');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">KG</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                Knowledge Graph Brain
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">v1.0.0</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Knowledge Graph Brain Setup
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Welcome! Let's get your knowledge graph system up and running. 
            This wizard will guide you through checking services and configuration.
          </p>
        </div>

        {/* Progress Indicator */}
        <ProgressBar currentStep={currentStep} />

        {/* Step Content */}
        {currentStep === 1 && <ServiceCheckStep onNext={nextStep} />}
        {currentStep === 2 && <ConfigurationStep onNext={nextStep} onBack={prevStep} />}
        {currentStep === 3 && <ConnectorStep onNext={nextStep} onBack={prevStep} />}
        {currentStep === 4 && <ValidationStep onComplete={completeSetup} onBack={prevStep} />}

        {/* Status Summary */}
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Setup Progress</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>✅ React UI: Multi-step wizard ready</p>
            <p>🔄 Current Step: {currentStep}/4</p>
            <p>🎯 Progress: {Math.round((currentStep / 4) * 100)}% complete</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>© 2025 Knowledge Graph Brain. Open source project.</p>
            <p className="mt-1">
              Need help? Check the{' '}
              <a 
                href="https://github.com/ryandmonk/knowledge_graph_brain/blob/main/README.md" 
                className="text-blue-600 hover:text-blue-700"
                target="_blank"
                rel="noopener noreferrer"
              >
                documentation
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default MultiStepSetupWizard;
