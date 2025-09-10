import { useState } from 'react';
import { Rocket, CheckCircle, AlertTriangle, RefreshCw, Download } from 'lucide-react';

interface ConnectorDeployStepProps {
  data: any;
  onComplete: (connector: any) => void;
  onPrevious: () => void;
}

export default function ConnectorDeployStep({ 
  data, 
  onComplete, 
  onPrevious 
}: ConnectorDeployStepProps) {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDeploy = async () => {
    setIsDeploying(true);
    setError(null);

    try {
      const payload = {
        name: data.name,
        description: data.description,
        apiUrl: data.apiUrl,
        schema: data.schema,
        configuration: data.configuration,
        openApiSpec: data.openApiSpec,
        schemaAnalysis: data.schemaAnalysis
      };

      const response = await fetch('/api/custom-connectors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Deployment failed: ${response.statusText}`);
      }

      const result = await response.json();
      setDeploymentResult(result);

      // Auto-complete after successful deployment
      setTimeout(() => {
        onComplete(result);
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deployment failed');
    } finally {
      setIsDeploying(false);
    }
  };

  const downloadConfig = () => {
    const config = {
      connector: {
        name: data.name,
        description: data.description,
        apiUrl: data.apiUrl,
        version: '1.0.0',
        configuration: data.configuration
      },
      schema: data.schema,
      openApiSpec: data.openApiSpec
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.name.toLowerCase().replace(/\s+/g, '-')}-connector.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Deploy Connector
        </h3>
        <p className="text-sm text-gray-600">
          Review your connector configuration and deploy it to the system
        </p>
      </div>

      {/* Deployment Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="text-sm font-medium text-gray-900 mb-4">Connector Summary</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Name
            </label>
            <p className="text-sm text-gray-900 mt-1">{data.name}</p>
          </div>
          
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              API URL
            </label>
            <p className="text-sm text-gray-900 mt-1 font-mono break-all">{data.apiUrl}</p>
          </div>
          
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Description
            </label>
            <p className="text-sm text-gray-900 mt-1">{data.description}</p>
          </div>
          
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Authentication
            </label>
            <p className="text-sm text-gray-900 mt-1 capitalize">
              {data.configuration?.authentication?.type || 'None'}
            </p>
          </div>
          
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              LLM Enhanced
            </label>
            <p className="text-sm text-gray-900 mt-1">
              {data.configuration?.llmEnhanced ? 'Yes' : 'No'}
            </p>
          </div>
          
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Entities
            </label>
            <p className="text-sm text-gray-900 mt-1">
              {data.schema?.entities?.length || 0}
            </p>
          </div>
          
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Relationships
            </label>
            <p className="text-sm text-gray-900 mt-1">
              {data.schema?.relationships?.length || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Deployment Status */}
      {isDeploying && (
        <div className="text-center py-8">
          <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600">Deploying connector...</p>
          <p className="text-xs text-gray-500 mt-1">
            This may take a few moments while we register your connector
          </p>
        </div>
      )}

      {/* Success State */}
      {deploymentResult && !error && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-green-900 mb-2">
            Connector Deployed Successfully!
          </h4>
          <p className="text-sm text-green-800 mb-4">
            Your custom connector has been registered and is ready to use.
          </p>
          
          {deploymentResult.connectorId && (
            <div className="bg-white border border-green-200 rounded p-3 mb-4">
              <label className="text-xs font-medium text-green-700 uppercase tracking-wide">
                Connector ID
              </label>
              <p className="text-sm font-mono text-green-900 mt-1">
                {deploymentResult.connectorId}
              </p>
            </div>
          )}
          
          <p className="text-xs text-green-700">
            You can now use this connector in your knowledge graph workflows.
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-900">Deployment Failed</h4>
              <p className="text-sm text-red-800 mt-1">{error}</p>
            </div>
          </div>
          
          <div className="mt-4 flex space-x-2">
            <button
              onClick={handleDeploy}
              className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200 transition-colors"
            >
              Retry Deployment
            </button>
            <button
              onClick={downloadConfig}
              className="text-sm bg-gray-100 text-gray-800 px-3 py-1 rounded hover:bg-gray-200 transition-colors"
            >
              Download Config
            </button>
          </div>
        </div>
      )}

      {/* Pre-deployment Actions */}
      {!isDeploying && !deploymentResult && !error && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Ready to Deploy</h4>
            <p className="text-sm text-blue-800 mb-3">
              Your connector configuration is complete and ready for deployment.
            </p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Schema has been analyzed and validated</li>
              <li>• Authentication settings configured</li>
              <li>• Connector will be registered in the system</li>
              <li>• Available immediately after deployment</li>
            </ul>
          </div>

          <div className="flex justify-center">
            <button
              onClick={downloadConfig}
              className="flex items-center px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors mr-3"
            >
              <Download size={16} className="mr-2" />
              Download Config
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-4 border-t border-gray-200">
        <button
          onClick={onPrevious}
          disabled={isDeploying || deploymentResult}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Previous
        </button>
        
        {!deploymentResult && (
          <button
            onClick={handleDeploy}
            disabled={isDeploying}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeploying ? (
              <>
                <RefreshCw size={16} className="mr-2 animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <Rocket size={16} className="mr-2" />
                Deploy Connector
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
