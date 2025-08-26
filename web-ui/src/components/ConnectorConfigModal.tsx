import { useState, useEffect } from 'react';
import { Settings, Save, TestTube, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../utils/api';

interface ConnectorConfigProps {
  connectorId: string;
  onConfigUpdate?: (connectorId: string, success: boolean) => void;
  onClose?: () => void;
}

interface ConnectorConfig {
  port: number;
  credentials: Record<string, string>;
  authFields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    value: string;
    placeholder?: string;
  }>;
}

function ConnectorConfigModal({ connectorId, onConfigUpdate, onClose }: ConnectorConfigProps) {
  const [config, setConfig] = useState<ConnectorConfig | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [portValue, setPortValue] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [portStatus, setPortStatus] = useState<any>(null);

  useEffect(() => {
    loadConfig();
    loadPortStatus();
  }, [connectorId]);

  const loadConfig = async () => {
    try {
      const data = await api.getConnectorConfig(connectorId);
      setConfig(data);
      setPortValue(data.port);
      
      // Initialize form data with current values
      const initialData: Record<string, string> = {};
      data.authFields.forEach((field: any) => {
        initialData[field.name] = field.value === '***' ? '' : field.value;
      });
      setFormData(initialData);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const loadPortStatus = async () => {
    try {
      const data = await api.getPortStatus();
      setPortStatus(data);
    } catch (err) {
      console.error('Failed to load port status:', err);
    }
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    setTestResult(null); // Clear test results when config changes
  };

  const testConfiguration = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      // First save the config temporarily or test with new values
      const result = await api.testConnector(connectorId);
      setTestResult(result);
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Test failed'
      });
    } finally {
      setTesting(false);
    }
  };

  const saveConfiguration = async () => {
    setSaving(true);
    setError(null);
    
    try {
      // Filter out empty/unchanged credentials
      const credentials: Record<string, string> = {};
      Object.entries(formData).forEach(([key, value]) => {
        if (value && value !== '***') {
          credentials[key] = value;
        }
      });

      const updateData: { credentials?: any; port?: number } = {};
      
      if (Object.keys(credentials).length > 0) {
        updateData.credentials = credentials;
      }
      
      if (portValue !== config?.port) {
        updateData.port = portValue;
      }

      const result = await api.updateConnectorConfig(connectorId, updateData);
      
      if (result.success) {
        await loadConfig(); // Reload to get updated values
        onConfigUpdate?.(connectorId, true);
        
        if (result.requiresRestart) {
          alert('Configuration saved! Please restart the connector service for changes to take effect.');
        }
      } else {
        setError(result.message || 'Failed to save configuration');
        onConfigUpdate?.(connectorId, false);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
      onConfigUpdate?.(connectorId, false);
    } finally {
      setSaving(false);
    }
  };

  const getConnectorDisplayName = (id: string): string => {
    const names: Record<string, string> = {
      'github': 'GitHub',
      'slack': 'Slack',
      'confluence': 'Confluence', 
      'retail-mock': 'Retail Mock'
    };
    return names[id] || id;
  };

  const isPortConflict = (port: number): boolean => {
    return portStatus?.usedPorts?.[port] && portStatus.usedPorts[port] !== getConnectorDisplayName(connectorId) + ' Connector';
  };

  const hasUnsavedChanges = (): boolean => {
    if (!config) return false;
    
    if (portValue !== config.port) return true;
    
    return config.authFields.some((field: any) => {
      const currentValue = formData[field.name] || '';
      const originalValue = field.value === '***' ? '' : field.value;
      return currentValue !== originalValue && currentValue !== '';
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
          <div className="text-center py-8">
            <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Configuration Error</h3>
            <p className="text-gray-600">{error || 'Failed to load connector configuration'}</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Settings className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Configure {getConnectorDisplayName(connectorId)} Connector
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Port Configuration */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-4">Service Port</h3>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Port Number
                </label>
                <input
                  type="number"
                  min="1000"
                  max="65535"
                  value={portValue}
                  onChange={(e) => setPortValue(parseInt(e.target.value) || 0)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    isPortConflict(portValue) ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {isPortConflict(portValue) && (
                  <p className="mt-1 text-sm text-red-600">
                    ⚠️ Port {portValue} is already used by {portStatus.usedPorts[portValue]}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Authentication Fields */}
          {config.authFields.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-4">Authentication Credentials</h3>
              <div className="space-y-4">
                {config.authFields.map((field) => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <input
                      type={field.type}
                      value={formData[field.name] || ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      placeholder={field.placeholder || (field.type === 'password' ? 'Enter new value to update' : '')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {field.type === 'password' && field.value === '***' && (
                      <p className="mt-1 text-xs text-gray-500">
                        Current value is set. Leave empty to keep unchanged.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test Configuration */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Test Connection</h3>
              <button
                onClick={testConfiguration}
                disabled={testing}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 disabled:opacity-50"
              >
                <TestTube className={`w-4 h-4 ${testing ? 'animate-pulse' : ''}`} />
                <span>{testing ? 'Testing...' : 'Test Connection'}</span>
              </button>
            </div>
            
            {testResult && (
              <div className={`p-3 rounded-lg ${
                testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center space-x-2">
                  {testResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {testResult.success ? 'Connection successful!' : 'Connection failed'}
                  </span>
                </div>
                <p className={`mt-1 text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {testResult.message}
                </p>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-800">Configuration Error</span>
              </div>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {hasUnsavedChanges() && (
                <span className="flex items-center space-x-1">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span>You have unsaved changes</span>
                </span>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveConfiguration}
                disabled={saving || !hasUnsavedChanges()}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConnectorConfigModal;
