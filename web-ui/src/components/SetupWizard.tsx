import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, RefreshCw, AlertTriangle, ChevronRight } from 'lucide-react';
import { api, type SetupProgress, type ServiceHealthCheck } from '../utils/api';
import { SETUP_STEPS, SERVICES } from '../utils/config';

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

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        {statusIcon}
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

              {/* Step 2: Configuration - Placeholder */}
              {step.id === 'configuration' && (
                <div className="text-center py-8">
                  <p className="text-gray-600">Configuration step coming next...</p>
                  <p className="text-sm text-gray-500 mt-2">
                    This will include environment variable management and AI model configuration.
                  </p>
                </div>
              )}

              {/* Step 3: Connectors - Placeholder */}
              {step.id === 'connectors' && (
                <div className="text-center py-8">
                  <p className="text-gray-600">Connector setup coming next...</p>
                  <p className="text-sm text-gray-500 mt-2">
                    This will include GitHub, Confluence, and Slack connector configuration.
                  </p>
                </div>
              )}

              {/* Step 4: Validation - Placeholder */}
              {step.id === 'validation' && (
                <div className="text-center py-8">
                  <p className="text-gray-600">Final validation coming next...</p>
                  <p className="text-sm text-gray-500 mt-2">
                    This will test the complete system and create a sample knowledge base.
                  </p>
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
