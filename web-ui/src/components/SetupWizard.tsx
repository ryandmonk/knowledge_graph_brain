import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, RefreshCw, AlertTriangle, ChevronRight } from 'lucide-react';
import { api, type SetupProgress, type ServiceHealthCheck } from '../utils/api';
import { SETUP_STEPS, SERVICES } from '../utils/config';
import ConnectorIcon from './ConnectorIcon';

interface StepProps {
  step: typeof SETUP_STEPS[0];
  isActive: boolean;
  isCompleted: boolean;
  children: React.ReactNode;
}

function Step({ step, isActive, isCompleted, children }: StepProps) {
  return (
    <div className={`card p-6 ${isActive ? 'ring-2 ring-primary-500' : ''}`}>
      <div className="flex items-start space-x-4">
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isCompleted ? 'bg-green-100 text-green-600' : 
          isActive ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'
        }`}>
          {isCompleted ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <span className="text-sm font-medium">{step.id === 'services' ? '1' : 
              step.id === 'configuration' ? '2' : step.id === 'connectors' ? '3' : '4'}</span>
          )}
        </div>
        <div className="flex-grow">
          <h3 className={`text-lg font-medium ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
            {step.title}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {step.description}
          </p>
          {isActive && (
            <div className="mt-4">
              {children}
            </div>
          )}
        </div>
        {!isActive && !isCompleted && (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </div>
    </div>
  );
}

function ServiceStatusCard({ service, onRecheck }: { 
  service: ServiceHealthCheck; 
  onRecheck: () => void;
}) {
  const statusIcon = service.status === 'healthy' ? (
    <CheckCircle className="w-5 h-5 text-green-600" />
  ) : service.status === 'checking' ? (
    <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
  ) : (
    <XCircle className="w-5 h-5 text-red-600" />
  );

  const statusColor = service.status === 'healthy' ? 'status-healthy' : 
    service.status === 'checking' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'status-error';

  // Extract connector ID from service name for connector-specific icons
  const getConnectorId = (serviceName: string) => {
    if (serviceName.toLowerCase().includes('github')) return 'github';
    if (serviceName.toLowerCase().includes('slack')) return 'slack';
    if (serviceName.toLowerCase().includes('confluence')) return 'confluence';
    if (serviceName.toLowerCase().includes('retail')) return 'retail-mock';
    return null;
  };

  const connectorId = getConnectorId(service.name);

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          {connectorId && (
            <ConnectorIcon 
              connectorId={connectorId} 
              className="text-gray-600" 
              size={20} 
            />
          )}
          {statusIcon}
        </div>
        <div>
          <h4 className="font-medium text-gray-900">{service.name}</h4>
          {service.port && (
            <p className="text-sm text-gray-500">Port {service.port}</p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusColor}`}>
          {service.status === 'checking' ? 'Checking...' : service.status}
        </span>
        {service.status !== 'checking' && (
          <button
            onClick={onRecheck}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Recheck
          </button>
        )}
      </div>
    </div>
  );
}

export function SetupWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [setupProgress, setSetupProgress] = useState<SetupProgress | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAllServices();
  }, []);

  const checkAllServices = async () => {
    setIsChecking(true);
    setError(null);
    
    try {
      const progress = await api.checkAllServices();
      setSetupProgress(progress);
      
      // Auto-advance to next step if core services are healthy
      if (progress.neo4j.status === 'healthy' && 
          progress.ollama.status === 'healthy' && 
          progress.orchestrator.status === 'healthy') {
        if (currentStep === 0) {
          setCurrentStep(1);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check services');
    } finally {
      setIsChecking(false);
    }
  };

  const recheckService = async (serviceName: string, url: string) => {
    if (!setupProgress) return;
    
    const updatedService = await api.checkService(url);
    
    setSetupProgress(prev => {
      if (!prev) return null;
      
      if (serviceName === 'neo4j') {
        return { ...prev, neo4j: updatedService };
      } else if (serviceName === 'ollama') {
        return { ...prev, ollama: updatedService };
      } else if (serviceName === 'orchestrator') {
        return { ...prev, orchestrator: updatedService };
      } else {
        const connectorIndex = prev.connectors.findIndex(c => c.name === updatedService.name);
        if (connectorIndex >= 0) {
          const newConnectors = [...prev.connectors];
          newConnectors[connectorIndex] = updatedService;
          return { ...prev, connectors: newConnectors };
        }
      }
      return prev;
    });
  };

  const getStepStatus = (stepIndex: number): { isActive: boolean; isCompleted: boolean } => {
    const isActive = currentStep === stepIndex;
    let isCompleted = false;
    
    if (stepIndex === 0 && setupProgress) {
      // Core services step is completed when Neo4j, Ollama, and Orchestrator are healthy
      isCompleted = setupProgress.neo4j.status === 'healthy' && 
                    setupProgress.ollama.status === 'healthy' && 
                    setupProgress.orchestrator.status === 'healthy';
    } else if (stepIndex === 1) {
      // Configuration step is completed when we've moved past it
      isCompleted = currentStep > 1;
    } else if (stepIndex === 2) {
      // Connectors step is completed when we've moved past it
      isCompleted = currentStep > 2;
    } else if (stepIndex === 3) {
      // Validation step is completed when setup is done
      isCompleted = currentStep >= 3;
    }
    
    return { isActive, isCompleted };
  };

  const coreServicesHealthy = setupProgress && 
    setupProgress.neo4j.status === 'healthy' && 
    setupProgress.ollama.status === 'healthy' && 
    setupProgress.orchestrator.status === 'healthy';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Knowledge Graph Brain Setup
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Welcome! Let's get your knowledge graph system up and running. 
          This wizard will guide you through checking services, configuration, and validation.
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex justify-between items-center mb-8 px-4">
        {SETUP_STEPS.map((step, index) => {
          const { isActive, isCompleted } = getStepStatus(index);
          return (
            <div key={step.id} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                isCompleted ? 'bg-green-600 text-white' : 
                isActive ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                {isCompleted ? <CheckCircle className="w-4 h-4" /> : index + 1}
              </div>
              {index < SETUP_STEPS.length - 1 && (
                <div className={`w-24 h-0.5 mx-4 ${
                  isCompleted ? 'bg-green-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-red-800">Setup Error</h4>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Setup Steps */}
      <div className="space-y-6">
        {SETUP_STEPS.map((step, index) => {
          const { isActive, isCompleted } = getStepStatus(index);
          
          return (
            <Step 
              key={step.id} 
              step={step} 
              isActive={isActive}
              isCompleted={isCompleted}
            >
              {/* Step 1: Core Services Check */}
              {step.id === 'services' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-gray-900">Service Status</h4>
                    <button
                      onClick={checkAllServices}
                      disabled={isChecking}
                      className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                      <span>{isChecking ? 'Checking...' : 'Refresh All'}</span>
                    </button>
                  </div>
                  
                  {setupProgress && (
                    <div className="space-y-3">
                      <ServiceStatusCard 
                        service={setupProgress.neo4j}
                        onRecheck={() => recheckService('neo4j', SERVICES.NEO4J.healthCheck)}
                      />
                      <ServiceStatusCard 
                        service={setupProgress.ollama}
                        onRecheck={() => recheckService('ollama', SERVICES.OLLAMA.healthCheck)}
                      />
                      <ServiceStatusCard 
                        service={setupProgress.orchestrator}
                        onRecheck={() => recheckService('orchestrator', SERVICES.ORCHESTRATOR.healthCheck)}
                      />
                    </div>
                  )}

                  {coreServicesHealthy && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-green-800 font-medium">Core services are running!</span>
                      </div>
                      <p className="text-sm text-green-700 mt-1">
                        Neo4j, Ollama, and the Orchestrator are all healthy. You can proceed to configuration.
                      </p>
                      <button
                        onClick={() => setCurrentStep(1)}
                        className="btn-primary mt-3"
                      >
                        Continue to Configuration
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Configuration - Enhanced */}
              {step.id === 'configuration' && (
                <div className="space-y-4">
                  <div className="text-center py-6">
                    <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h4 className="font-medium text-gray-900 mb-2">System Ready for Configuration</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Your Knowledge Graph Brain is ready! Core services are healthy and the system can be configured through the operational dashboard.
                    </p>
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="btn-primary"
                    >
                      Continue to Connectors
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Connectors - Enhanced */}
              {step.id === 'connectors' && (
                <div className="space-y-6">
                  {/* Data Connectors Section */}
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-sm font-medium">🔌</span>
                      </div>
                      <h4 className="font-medium text-gray-900">Data Connectors</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Choose and configure data sources for your knowledge graph
                    </p>
                    
                    {/* Connector Services Status */}
                    {setupProgress && setupProgress.connectors && setupProgress.connectors.length > 0 && (
                      <div className="space-y-3 mb-6">
                        {setupProgress.connectors.map((connector) => (
                          <div key={connector.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                <ConnectorIcon 
                                  connectorId={connector.name.toLowerCase().replace(' connector', '').replace('-connector', '')} 
                                  className="text-gray-600" 
                                  size={20} 
                                />
                                {connector.status === 'healthy' ? (
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : connector.status === 'checking' ? (
                                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-red-600" />
                                )}
                              </div>
                              <div>
                                <h5 className="font-medium text-gray-900">
                                  {connector.name.replace(' Connector', '').replace('-connector', '')}
                                </h5>
                                <p className="text-sm text-gray-500">Port {connector.port}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
                                connector.status === 'healthy' ? 'status-healthy' : 
                                connector.status === 'checking' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'status-error'
                              }`}>
                                {connector.status === 'checking' ? 'Checking...' : connector.status}
                              </span>
                              <button className="text-sm text-primary-600 hover:text-primary-700">
                                Test
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Connector Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      {[
                        { id: 'github', name: 'GitHub', description: 'Repositories & Issues' },
                        { id: 'confluence', name: 'Confluence', description: 'Pages & Spaces' },
                        { id: 'slack', name: 'Slack', description: 'Messages & Channels' },
                        { id: 'retail-mock', name: 'Demo Data', description: 'Sample Products' }
                      ].map((connector) => (
                        <div
                          key={connector.id}
                          className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                        >
                          <div className="flex flex-col items-center text-center space-y-2">
                            <ConnectorIcon 
                              connectorId={connector.id} 
                              className="text-blue-600" 
                              size={32} 
                            />
                            <h5 className="font-medium text-gray-900">{connector.name}</h5>
                            <p className="text-xs text-gray-500">{connector.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4">
                      Configure these through the dashboard after setup completion.
                    </p>
                    
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="btn-primary"
                    >
                      Continue to Validation
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Validation - Complete */}
              {step.id === 'validation' && (
                <div className="space-y-4">
                  <div className="text-center py-6">
                    <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h4 className="font-medium text-gray-900 mb-2">Setup Complete!</h4>
                    <p className="text-sm text-gray-600 mb-6">
                      Your Knowledge Graph Brain is ready to use. You can now start ingesting data and asking questions through the operational dashboard.
                    </p>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="btn-primary text-lg px-8 py-3"
                    >
                      Launch Knowledge Graph Brain
                    </button>
                  </div>
                </div>
              )}
            </Step>
          );
        })}
      </div>

      {/* Next Steps */}
      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">What's Next?</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✅ Service health monitoring with auto-refresh</li>
          <li>🔄 Environment configuration management</li>
          <li>🔌 Visual connector setup and testing</li>
          <li>🎯 End-to-end system validation</li>
        </ul>
      </div>
    </div>
  );
}
