import { useState } from 'react';
import { Globe, Search, AlertTriangle, CheckCircle, Settings, Lock, X } from 'lucide-react';
import { api } from '../utils/api';

interface RestAPIAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchemaGenerated?: (schema: any) => void;
}

interface AnalysisResult {
  generated_schema: any;
  analysis_insights: {
    confidence: number;
    discovered_entities: number;
    inferred_relationships: number;
    field_mappings: number;
    optimization_opportunities: number;
  };
  recommendations: Array<{
    type: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
  }>;
}

export function RestAPIAnalyzerModal({ isOpen, onClose, onSchemaGenerated }: RestAPIAnalyzerModalProps) {
  const [apiUrl, setApiUrl] = useState('');
  const [kbId, setKbId] = useState('');
  const [authType, setAuthType] = useState<'none' | 'api-key' | 'bearer' | 'basic'>('none');
  const [authConfig, setAuthConfig] = useState<any>({});
  const [sampleEndpoints, setSampleEndpoints] = useState<string[]>([]);
  const [newEndpoint, setNewEndpoint] = useState('');
  const [domain, setDomain] = useState('');
  const [businessGoals, setBusinessGoals] = useState<string[]>([]);
  const [newBusinessGoal, setNewBusinessGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const resetModal = () => {
    setApiUrl('');
    setKbId('');
    setAuthType('none');
    setAuthConfig({});
    setSampleEndpoints([]);
    setNewEndpoint('');
    setDomain('');
    setBusinessGoals([]);
    setNewBusinessGoal('');
    setLoading(false);
    setError(null);
    setAnalysisResult(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleAuthConfigChange = (field: string, value: string) => {
    setAuthConfig((prev: any) => ({ ...prev, [field]: value }));
  };

  const addEndpoint = () => {
    if (newEndpoint.trim() && !sampleEndpoints.includes(newEndpoint.trim())) {
      setSampleEndpoints(prev => [...prev, newEndpoint.trim()]);
      setNewEndpoint('');
    }
  };

  const removeEndpoint = (index: number) => {
    setSampleEndpoints(prev => prev.filter((_, i) => i !== index));
  };

  const addBusinessGoal = () => {
    if (newBusinessGoal.trim() && !businessGoals.includes(newBusinessGoal.trim())) {
      setBusinessGoals(prev => [...prev, newBusinessGoal.trim()]);
      setNewBusinessGoal('');
    }
  };

  const removeBusinessGoal = (index: number) => {
    setBusinessGoals(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyzeAPI = async () => {
    if (!apiUrl || !kbId) {
      setError('Please provide both API URL and Knowledge Base ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Prepare auth config
      let authConfigToSend = undefined;
      if (authType !== 'none') {
        authConfigToSend = {
          type: authType,
          ...authConfig
        };
      }

      const result = await api.analyzeRestAPI({
        api_url: apiUrl,
        kb_id: kbId,
        auth_config: authConfigToSend,
        sample_endpoints: sampleEndpoints.length > 0 ? sampleEndpoints : undefined,
        context: {
          domain: domain || undefined,
          businessGoals: businessGoals.length > 0 ? businessGoals : undefined
        }
      });

      setAnalysisResult(result);
      
      if (onSchemaGenerated) {
        onSchemaGenerated(result.generated_schema);
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to analyze REST API');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                🔍 REST API Analyzer
              </h2>
              <p className="text-gray-600">
                Analyze live REST APIs with AI-powered schema generation
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {!analysisResult ? (
            <div className="space-y-6">
              {/* API Configuration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Base URL *
                  </label>
                  <input
                    type="url"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://api.example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Knowledge Base ID *
                  </label>
                  <input
                    type="text"
                    value={kbId}
                    onChange={(e) => setKbId(e.target.value)}
                    placeholder="my-api-kb"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Authentication */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                  <Lock className="w-5 h-5" />
                  <span>Authentication</span>
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Authentication Type
                    </label>
                    <select
                      value={authType}
                      onChange={(e) => setAuthType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="none">No Authentication</option>
                      <option value="api-key">API Key</option>
                      <option value="bearer">Bearer Token</option>
                      <option value="basic">Basic Auth</option>
                    </select>
                  </div>

                  {authType === 'api-key' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Header Name
                        </label>
                        <input
                          type="text"
                          value={authConfig.header_name || ''}
                          onChange={(e) => handleAuthConfigChange('header_name', e.target.value)}
                          placeholder="X-API-Key"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          API Key
                        </label>
                        <input
                          type="password"
                          value={authConfig.api_key || ''}
                          onChange={(e) => handleAuthConfigChange('api_key', e.target.value)}
                          placeholder="Your API key"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  {authType === 'bearer' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bearer Token
                      </label>
                      <input
                        type="password"
                        value={authConfig.token || ''}
                        onChange={(e) => handleAuthConfigChange('token', e.target.value)}
                        placeholder="Your bearer token"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}

                  {authType === 'basic' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Username
                        </label>
                        <input
                          type="text"
                          value={authConfig.username || ''}
                          onChange={(e) => handleAuthConfigChange('username', e.target.value)}
                          placeholder="Username"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Password
                        </label>
                        <input
                          type="password"
                          value={authConfig.password || ''}
                          onChange={(e) => handleAuthConfigChange('password', e.target.value)}
                          placeholder="Password"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sample Endpoints */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">
                  Sample Endpoints (optional)
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Specify endpoint paths to analyze. If none provided, common REST patterns will be used.
                </p>
                
                {sampleEndpoints.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {sampleEndpoints.map((endpoint, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {endpoint}
                        <button
                          type="button"
                          onClick={() => removeEndpoint(index)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newEndpoint}
                    onChange={(e) => setNewEndpoint(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addEndpoint();
                      }
                    }}
                    placeholder="/users, /posts, /products..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={addEndpoint}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    disabled={!newEndpoint.trim()}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* AI Context */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-purple-50 to-blue-50">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-purple-600" />
                  <span>🧠 AI Context (optional)</span>
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Domain/Industry
                    </label>
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="e.g., Healthcare, E-commerce, Finance"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Goals
                    </label>
                    {businessGoals.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {businessGoals.map((goal, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800"
                          >
                            {goal}
                            <button
                              type="button"
                              onClick={() => removeBusinessGoal(index)}
                              className="ml-1 text-purple-600 hover:text-purple-800"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newBusinessGoal}
                        onChange={(e) => setNewBusinessGoal(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addBusinessGoal();
                          }
                        }}
                        placeholder="Add a business goal..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                      <button
                        type="button"
                        onClick={addBusinessGoal}
                        className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                        disabled={!newBusinessGoal.trim()}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="text-red-800 font-medium">Error</span>
                  </div>
                  <p className="text-red-700 mt-1">{error}</p>
                </div>
              )}

              <button
                onClick={handleAnalyzeAPI}
                disabled={loading || !apiUrl || !kbId}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Analyzing API...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    <span>Analyze API with AI</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Results Display */
            <div className="space-y-6">
              <div className="flex items-center space-x-2 text-green-600 mb-4">
                <CheckCircle className="w-6 h-6" />
                <h3 className="text-lg font-medium">Analysis Complete!</h3>
              </div>

              {/* Analysis Insights */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-3">🔍 Analysis Insights</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center justify-between p-2 bg-white/50 rounded">
                    <span className="text-green-700 font-medium">Confidence:</span>
                    <span className="text-green-800 font-semibold">
                      {(analysisResult.analysis_insights.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white/50 rounded">
                    <span className="text-green-700 font-medium">Entities:</span>
                    <span className="text-green-800 font-semibold">{analysisResult.analysis_insights.discovered_entities}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white/50 rounded">
                    <span className="text-green-700 font-medium">Relationships:</span>
                    <span className="text-green-800 font-semibold">{analysisResult.analysis_insights.inferred_relationships}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white/50 rounded">
                    <span className="text-green-700 font-medium">Field Mappings:</span>
                    <span className="text-green-800 font-semibold">{analysisResult.analysis_insights.field_mappings}</span>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              {analysisResult.recommendations.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">💡 AI Recommendations</h4>
                  <div className="space-y-2">
                    {analysisResult.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          rec.impact === 'high' ? 'bg-red-500' :
                          rec.impact === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}></div>
                        <div>
                          <div className="font-medium text-gray-900">{rec.type}</div>
                          <div className="text-sm text-gray-600">{rec.description}</div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          rec.impact === 'high' ? 'bg-red-100 text-red-800' :
                          rec.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {rec.impact}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generated Schema Preview */}
              <div className="border border-gray-200 rounded-lg">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                  <h4 className="font-medium text-gray-900">Generated Schema</h4>
                </div>
                <pre className="p-4 text-sm bg-gray-50 overflow-x-auto max-h-60">
                  {JSON.stringify(analysisResult.generated_schema, null, 2)}
                </pre>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    if (onSchemaGenerated) {
                      onSchemaGenerated(analysisResult.generated_schema);
                    }
                    handleClose();
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Use This Schema
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
