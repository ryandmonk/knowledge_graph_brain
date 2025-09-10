import { useState } from 'react';
import { X, Upload, Settings, Eye, Rocket } from 'lucide-react';
import SchemaUploadStep from './SchemaUploadStep';
import ConnectorConfigStep from './ConnectorConfigStep';
import SchemaPreviewStep from './SchemaPreviewStep';
import ConnectorDeployStep from './ConnectorDeployStep';

interface ConnectorBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectorCreated?: (connector: any) => void;
}

interface ConnectorData {
  name: string;
  description: string;
  apiUrl: string;
  openApiSpec?: any;
  schema?: any;
  configuration?: any;
}

const steps = [
  { id: 'upload', title: 'Upload Schema', icon: Upload },
  { id: 'configure', title: 'Configure', icon: Settings },
  { id: 'preview', title: 'Preview', icon: Eye },
  { id: 'deploy', title: 'Deploy', icon: Rocket }
];

export default function ConnectorBuilderModal({ 
  isOpen, 
  onClose, 
  onConnectorCreated 
}: ConnectorBuilderModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [connectorData, setConnectorData] = useState<ConnectorData>({
    name: '',
    description: '',
    apiUrl: ''
  });

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepComplete = (stepData: any) => {
    setConnectorData(prev => ({ ...prev, ...stepData }));
    handleNext();
  };

  const handleConnectorCreated = (connector: any) => {
    alert('Custom connector created successfully!');
    onConnectorCreated?.(connector);
    onClose();
    // Reset for next use
    setCurrentStep(0);
    setConnectorData({
      name: '',
      description: '',
      apiUrl: ''
    });
  };

  const renderCurrentStep = () => {
    const stepId = steps[currentStep].id;
    
    switch (stepId) {
      case 'upload':
        return (
          <SchemaUploadStep
            onComplete={handleStepComplete}
          />
        );
      case 'configure':
        return (
          <ConnectorConfigStep
            data={connectorData}
            onComplete={handleStepComplete}
            onPrevious={handlePrevious}
          />
        );
      case 'preview':
        return (
          <SchemaPreviewStep
            data={connectorData}
            onComplete={handleStepComplete}
            onPrevious={handlePrevious}
          />
        );
      case 'deploy':
        return (
          <ConnectorDeployStep
            data={connectorData}
            onComplete={handleConnectorCreated}
            onPrevious={handlePrevious}
          />
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Create Custom Connector
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Build a custom connector from your OpenAPI specification
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors
                    ${isActive 
                      ? 'border-blue-500 bg-blue-500 text-white' 
                      : isCompleted 
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-gray-300 bg-white text-gray-400'
                    }
                  `}>
                    <Icon size={16} />
                  </div>
                  <span className={`
                    ml-2 text-sm font-medium transition-colors
                    ${isActive 
                      ? 'text-blue-600' 
                      : isCompleted 
                        ? 'text-green-600'
                        : 'text-gray-500'
                    }
                  `}>
                    {step.title}
                  </span>
                  {index < steps.length - 1 && (
                    <div className={`
                      mx-4 h-0.5 w-8 transition-colors
                      ${index < currentStep ? 'bg-green-500' : 'bg-gray-300'}
                    `} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {renderCurrentStep()}
        </div>
      </div>
    </div>
  );
}
