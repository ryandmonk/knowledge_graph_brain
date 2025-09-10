import { useState, useEffect } from 'react';
import { 
  Settings, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Save, 
  Download, 
  Database, 
  Cpu, 
  Shield,
  AlertTriangle,
  RotateCcw,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import { api, type EnvironmentConfig } from '../../utils/api';

interface ConfigurationTemplate {
  id: string;
  name: string;
  description: string;
  environment: 'development' | 'staging' | 'production';
  config: Partial<EnvironmentConfig>;
}

interface ConfigurationBackup {
  id: string;
  name: string;
  created_at: string;
  config: EnvironmentConfig;
  environment: string;
}

interface ValidationResult {
  field: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

export function ConfigurationDashboard() {
  const [currentConfig, setCurrentConfig] = useState<EnvironmentConfig | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [templates, setTemplates] = useState<ConfigurationTemplate[]>([]);
  const [backups, setBackups] = useState<ConfigurationBackup[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'templates' | 'backups' | 'advanced'>('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadConfigurationData();
  }, []);

  const loadConfigurationData = async () => {
    try {
      setLoading(true);
      const [config, validationData, templatesData, backupsData] = await Promise.all([
        api.getEnvironmentConfig(),
        validateConfiguration(),
        loadTemplates(),
        loadBackups()
      ]);

      setCurrentConfig(config);
      setValidationResults(validationData);
      setTemplates(templatesData);
      setBackups(backupsData);
    } catch (error) {
      console.error('Failed to load configuration data:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateConfiguration = async (): Promise<ValidationResult[]> => {
    try {
      setValidating(true);
      // This would call a comprehensive validation API
      // For now, we'll simulate with the current config
      const config = await api.getEnvironmentConfig();
      const results: ValidationResult[] = [];

      // Neo4j validation
      if (!config.NEO4J_URI || !config.NEO4J_URI.match(/^(bolt|neo4j):\/\/.+/)) {
        results.push({
          field: 'NEO4J_URI',
          status: 'error',
          message: 'Invalid Neo4j URI format',
          details: 'URI must start with bolt:// or neo4j://'
        });
      } else {
        results.push({
          field: 'NEO4J_URI',
          status: 'success',
          message: 'Neo4j URI format is valid'
        });
      }

      // Security validation
      if (config.NEO4J_PASSWORD === 'password') {
        results.push({
          field: 'NEO4J_PASSWORD',
          status: 'warning',
          message: 'Using default password',
          details: 'Consider using a stronger password for production'
        });
      }

      // AI Provider validation
      if (config.EMBEDDING_PROVIDER === 'openai' && !config.OPENAI_API_KEY) {
        results.push({
          field: 'OPENAI_API_KEY',
          status: 'error',
          message: 'OpenAI API key required',
          details: 'OpenAI provider selected but no API key configured'
        });
      }

      // Performance validation
      if (config.OLLAMA_BASE_URL && !config.OLLAMA_BASE_URL.includes('localhost')) {
        results.push({
          field: 'OLLAMA_BASE_URL',
          status: 'warning',
          message: 'Remote Ollama instance',
          details: 'Remote instances may have higher latency'
        });
      }

      return results;
    } catch (error) {
      return [{
        field: 'system',
        status: 'error',
        message: 'Failed to validate configuration'
      }];
    } finally {
      setValidating(false);
    }
  };

  const loadTemplates = async (): Promise<ConfigurationTemplate[]> => {
    // Simulate loading templates - in real implementation, this would be an API call
    return [
      {
        id: 'dev',
        name: 'Development',
        description: 'Local development with default settings',
        environment: 'development',
        config: {
          DEMO_MODE: true,
          NEO4J_URI: 'bolt://localhost:7687',
          NEO4J_USER: 'neo4j',
          NEO4J_PASSWORD: 'password',
          EMBEDDING_PROVIDER: 'ollama',
          OLLAMA_BASE_URL: 'http://localhost:11434',
          LLM_MODEL: 'qwen3:8b',
          EMBEDDING_MODEL: 'mxbai-embed-large'
        }
      },
      {
        id: 'staging',
        name: 'Staging',
        description: 'Staging environment with enhanced security',
        environment: 'staging',
        config: {
          DEMO_MODE: false,
          NEO4J_URI: 'bolt://staging-neo4j:7687',
          NEO4J_USER: 'neo4j',
          EMBEDDING_PROVIDER: 'openai',
          LLM_MODEL: 'gpt-4',
          EMBEDDING_MODEL: 'text-embedding-3-small'
        }
      },
      {
        id: 'prod',
        name: 'Production',
        description: 'Production environment with full security',
        environment: 'production',
        config: {
          DEMO_MODE: false,
          NEO4J_URI: 'bolt://prod-neo4j:7687',
          NEO4J_USER: 'app_user',
          EMBEDDING_PROVIDER: 'openai',
          LLM_MODEL: 'gpt-4-turbo',
          EMBEDDING_MODEL: 'text-embedding-3-large'
        }
      }
    ];
  };

  const loadBackups = async (): Promise<ConfigurationBackup[]> => {
    // Simulate loading backups - in real implementation, this would be an API call
    return [
      {
        id: 'backup_1',
        name: 'Pre-upgrade backup',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        config: currentConfig || {} as EnvironmentConfig,
        environment: 'production'
      }
    ];
  };

  const applyTemplate = async (template: ConfigurationTemplate) => {
    if (!currentConfig) return;

    const newConfig = { ...currentConfig, ...template.config };
    setCurrentConfig(newConfig);
    setHasChanges(true);
    
    // Re-validate with new config
    const results = await validateConfiguration();
    setValidationResults(results);
  };

  const createBackup = async (name: string) => {
    if (!currentConfig) return;

    const backup: ConfigurationBackup = {
      id: `backup_${Date.now()}`,
      name,
      created_at: new Date().toISOString(),
      config: currentConfig,
      environment: currentConfig.DEMO_MODE ? 'development' : 'production'
    };

    setBackups(prev => [backup, ...prev]);
  };

  const restoreBackup = async (backup: ConfigurationBackup) => {
    setCurrentConfig(backup.config);
    setHasChanges(true);
    
    // Re-validate with restored config
    const results = await validateConfiguration();
    setValidationResults(results);
  };

  const saveConfiguration = async () => {
    if (!currentConfig) return;

    try {
      setSaving(true);
      await api.updateConfig(currentConfig);
      setHasChanges(false);
      
      // Re-validate after save
      const results = await validateConfiguration();
      setValidationResults(results);
    } catch (error) {
      console.error('Failed to save configuration:', error);
    } finally {
      setSaving(false);
    }
  };

  const getValidationStatusIcon = (status: ValidationResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const maskSensitiveValue = (key: string, value: string) => {
    const sensitiveFields = ['PASSWORD', 'API_KEY', 'TOKEN', 'SECRET'];
    if (sensitiveFields.some(field => key.includes(field))) {
      return showSensitive ? value : '••••••••';
    }
    return value;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="ml-3 text-gray-600">Loading configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div className="flex-grow">
            <h2 className="text-xl font-semibold text-gray-900">Advanced Configuration Dashboard</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage system configuration, templates, and backups with real-time validation
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowSensitive(!showSensitive)}
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              {showSensitive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showSensitive ? 'Hide' : 'Show'} Sensitive</span>
            </button>
            <button
              onClick={saveConfiguration}
              disabled={!hasChanges || saving}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-6 mt-6 border-b border-gray-200">
          {[
            { id: 'overview', label: 'Validation Overview', icon: Shield },
            { id: 'templates', label: 'Configuration Templates', icon: Copy },
            { id: 'backups', label: 'Backup & Restore', icon: Download },
            { id: 'advanced', label: 'Advanced Settings', icon: Database }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-3 px-1 border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Configuration Validation</h3>
            <button
              onClick={validateConfiguration}
              disabled={validating}
              className="flex items-center space-x-2 text-sm bg-gray-50 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${validating ? 'animate-spin' : ''}`} />
              <span>{validating ? 'Validating...' : 'Re-validate'}</span>
            </button>
          </div>

          <div className="space-y-4">
            {validationResults.map((result, index) => (
              <div key={index} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                {getValidationStatusIcon(result.status)}
                <div className="flex-grow">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{result.field}</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      result.status === 'success' ? 'bg-green-100 text-green-800' :
                      result.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {result.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                  {result.details && (
                    <p className="text-xs text-gray-500 mt-1">{result.details}</p>
                  )}
                </div>
              </div>
            ))}

            {validationResults.length === 0 && !validating && (
              <div className="text-center py-8">
                <p className="text-gray-500">No validation results available</p>
                <p className="text-sm text-gray-400 mt-1">Click "Re-validate" to check your configuration</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Configuration Templates</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {templates.map(template => (
              <div key={template.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">{template.name}</h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    template.environment === 'production' ? 'bg-red-100 text-red-800' :
                    template.environment === 'staging' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {template.environment}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="text-xs text-gray-500">Key Settings:</div>
                  <div className="space-y-1 text-xs">
                    <div>Provider: {template.config.EMBEDDING_PROVIDER}</div>
                    <div>Model: {template.config.LLM_MODEL}</div>
                    <div>Demo Mode: {template.config.DEMO_MODE ? 'Yes' : 'No'}</div>
                  </div>
                </div>

                <button
                  onClick={() => applyTemplate(template)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Apply Template
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'backups' && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Configuration Backups</h3>
            <button
              onClick={() => {
                const name = prompt('Enter backup name:');
                if (name) createBackup(name);
              }}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Create Backup</span>
            </button>
          </div>

          <div className="space-y-4">
            {backups.map(backup => (
              <div key={backup.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{backup.name}</h4>
                  <p className="text-sm text-gray-500">
                    Created: {new Date(backup.created_at).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">Environment: {backup.environment}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => restoreBackup(backup)}
                    className="flex items-center space-x-2 text-sm bg-gray-50 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-100"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Restore</span>
                  </button>
                </div>
              </div>
            ))}

            {backups.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No configuration backups found</p>
                <p className="text-sm text-gray-400 mt-1">Create your first backup to save current settings</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'advanced' && currentConfig && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Advanced Configuration Settings</h3>
          
          <div className="space-y-6">
            {/* Neo4j Advanced Settings */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                <Database className="w-4 h-4 mr-2" />
                Neo4j Database Settings
              </h4>
              <div className="space-y-4">
                {Object.entries(currentConfig)
                  .filter(([key]) => key.startsWith('NEO4J_'))
                  .map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        {key.replace('NEO4J_', '').replace(/_/g, ' ')}
                      </label>
                      <input
                        type="text"
                        value={maskSensitiveValue(key, String(value || ''))}
                        onChange={(e) => {
                          setCurrentConfig(prev => prev ? { ...prev, [key]: e.target.value } : null);
                          setHasChanges(true);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  ))}
              </div>
            </div>

            {/* AI Provider Advanced Settings */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                <Cpu className="w-4 h-4 mr-2" />
                AI Provider Settings
              </h4>
              <div className="space-y-4">
                {Object.entries(currentConfig)
                  .filter(([key]) => key.includes('MODEL') || key.includes('OLLAMA') || key.includes('OPENAI'))
                  .map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        {key.replace(/_/g, ' ')}
                      </label>
                      <input
                        type="text"
                        value={maskSensitiveValue(key, String(value || ''))}
                        onChange={(e) => {
                          setCurrentConfig(prev => prev ? { ...prev, [key]: e.target.value } : null);
                          setHasChanges(true);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Changes Indicator */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">Unsaved changes</span>
          </div>
          <p className="text-xs text-yellow-700 mt-1">
            Remember to save your configuration changes
          </p>
        </div>
      )}
    </div>
  );
}
