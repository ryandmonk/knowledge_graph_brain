import { useState } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle, Eye, X, Settings } from 'lucide-react';
import { api } from '../utils/api';

interface SchemaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchemaRegistered?: (kb_id: string) => void;
}

interface ParsedSchema {
  generated_schema: any;
  api_info: {
    title: string;
    version: string;
    description?: string;
    endpoints_found: number;
    schemas_found: number;
  };
  validation_warnings?: any[];
  llm_insights?: {
    confidence: number;
    enhanced_nodes: number;
    intelligent_relationships: number;
    field_suggestions: number;
    optimizations: number;
  };
}

export function SchemaUploadModal({ isOpen, onClose, onSchemaRegistered }: SchemaUploadModalProps) {
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'configure'>('upload');
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url' | 'paste'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [specContent, setSpecContent] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [kbId, setKbId] = useState('');
  const [connectorUrl, setConnectorUrl] = useState('');
  const [parsedSchema, setParsedSchema] = useState<ParsedSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // LLM Enhancement Options
  const [useLLMEnhancement, setUseLLMEnhancement] = useState(true);
  const [domain, setDomain] = useState('');
  const [businessGoals, setBusinessGoals] = useState<string[]>([]);
  const [newBusinessGoal, setNewBusinessGoal] = useState('');

  const resetModal = () => {
    setCurrentStep('upload');
    setUploadMethod('file');
    setFile(null);
    setSpecContent('');
    setApiUrl('');
    setKbId('');
    setConnectorUrl('');
    setParsedSchema(null);
    setLoading(false);
    setError(null);
    setUseLLMEnhancement(true);
    setDomain('');
    setBusinessGoals([]);
    setNewBusinessGoal('');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      
      // Auto-generate kb_id from filename
      const baseName = selectedFile.name.replace(/\.(json|yaml|yml)$/i, '');
      const cleanId = baseName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      setKbId(cleanId + '-kb');
    }
  };

  const [loadingMessage, setLoadingMessage] = useState('Parsing specification...');

  const handleParseSchema = async () => {
    setLoading(true);
    setError(null);

    try {
      let content = '';

      if (uploadMethod === 'file' && file) {
        content = await file.text();
      } else if (uploadMethod === 'url' && apiUrl) {
        // Fetch OpenAPI spec from URL
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch OpenAPI spec: ${response.statusText}`);
        }
        content = await response.text();
      } else if (uploadMethod === 'paste' && specContent) {
        content = specContent;
      } else {
        throw new Error('Please provide OpenAPI specification');
      }

      if (!kbId) {
        throw new Error('Please provide a knowledge base ID');
      }

      // Set loading message based on spec size and enhancement mode
      const specSizeKB = content.length / 1024;
      if (useLLMEnhancement) {
        if (specSizeKB > 2000) {
          setLoadingMessage('Processing large API specification with AI enhancement... This may take up to 10 minutes for complex APIs like Jira.');
        } else if (specSizeKB > 500) {
          setLoadingMessage('Processing API specification with AI enhancement... This may take up to 5 minutes.');
        } else {
          setLoadingMessage('Processing with AI enhancement... This may take up to 3 minutes.');
        }
      } else {
        setLoadingMessage('Parsing specification...');
      }

      // Parse OpenAPI spec with optional LLM enhancement
      const result = useLLMEnhancement 
        ? await api.parseOpenAPISpecEnhanced({
            spec_content: content,
            kb_id: kbId,
            connector_url: connectorUrl || undefined,
            context: {
              domain: domain || undefined,
              businessGoals: businessGoals.length > 0 ? businessGoals : undefined
            }
          })
        : await api.parseOpenAPISpec({
            spec_content: content,
            kb_id: kbId,
            connector_url: connectorUrl || undefined
          });

      setParsedSchema(result);
      setCurrentStep('preview');

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to parse OpenAPI specification');
    } finally {
      setLoading(false);
      setLoadingMessage('Parsing specification...');
    }
  };

  const handleRegisterSchema = async () => {
    if (!parsedSchema) return;

    setLoading(true);
    setError(null);

    try {
      // Convert schema to YAML string for registration
      const schemaYaml = JSON.stringify(parsedSchema.generated_schema, null, 2);
      
      await api.registerCustomConnectorSchema({
        schema_yaml: schemaYaml,
        kb_id: kbId
      });

      onSchemaRegistered?.(kbId);
      handleClose();

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to register custom connector');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Upload className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Create Custom Connector
              </h2>
            </div>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Step Indicator */}
          <div className="flex items-center space-x-4 mt-4">
            <div className={`flex items-center space-x-2 ${currentStep === 'upload' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'upload' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="text-sm font-medium">Upload Spec</span>
            </div>
            <div className="w-8 h-px bg-gray-300"></div>
            <div className={`flex items-center space-x-2 ${currentStep === 'preview' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="text-sm font-medium">Preview Schema</span>
            </div>
            <div className="w-8 h-px bg-gray-300"></div>
            <div className={`flex items-center space-x-2 ${currentStep === 'configure' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'configure' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                3
              </div>
              <span className="text-sm font-medium">Configure</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Upload OpenAPI Spec */}
          {currentStep === 'upload' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">OpenAPI Specification</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Upload your OpenAPI/Swagger specification to automatically generate a custom connector for your Knowledge Graph.
                </p>

                {/* Upload Method Selection */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <button
                    onClick={() => setUploadMethod('file')}
                    className={`p-4 border-2 rounded-lg text-center transition-colors ${
                      uploadMethod === 'file' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <FileText className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <div className="font-medium">Upload File</div>
                    <div className="text-sm text-gray-500">JSON or YAML</div>
                  </button>
                  
                  <button
                    onClick={() => setUploadMethod('url')}
                    className={`p-4 border-2 rounded-lg text-center transition-colors ${
                      uploadMethod === 'url' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Settings className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <div className="font-medium">From URL</div>
                    <div className="text-sm text-gray-500">Remote spec</div>
                  </button>
                  
                  <button
                    onClick={() => setUploadMethod('paste')}
                    className={`p-4 border-2 rounded-lg text-center transition-colors ${
                      uploadMethod === 'paste' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Eye className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <div className="font-medium">Paste Content</div>
                    <div className="text-sm text-gray-500">Copy & paste</div>
                  </button>
                </div>

                {/* Upload Method Content */}
                {uploadMethod === 'file' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select OpenAPI File
                    </label>
                    <input
                      type="file"
                      accept=".json,.yaml,.yml"
                      onChange={handleFileUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {file && (
                      <p className="mt-2 text-sm text-green-600">
                        Selected: {file.name}
                      </p>
                    )}
                  </div>
                )}

                {uploadMethod === 'url' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      OpenAPI Specification URL
                    </label>
                    <input
                      type="url"
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                      placeholder="https://api.example.com/openapi.json"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                {uploadMethod === 'paste' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Paste OpenAPI Specification
                    </label>
                    <textarea
                      value={specContent}
                      onChange={(e) => setSpecContent(e.target.value)}
                      placeholder="Paste your OpenAPI specification here (JSON or YAML)..."
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Configuration */}
              <div className="grid grid-cols-2 gap-4">
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
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Connector URL (optional)
                  </label>
                  <input
                    type="url"
                    value={connectorUrl}
                    onChange={(e) => setConnectorUrl(e.target.value)}
                    placeholder="http://localhost:3000/api"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* LLM Enhancement Options */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-purple-50 to-blue-50">
                <div className="flex items-center space-x-2 mb-3">
                  <Settings className="w-5 h-5 text-purple-600" />
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useLLMEnhancement}
                      onChange={(e) => setUseLLMEnhancement(e.target.checked)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      🧠 Enable AI-Enhanced Schema Generation
                    </span>
                  </label>
                </div>
                
                {useLLMEnhancement && (
                  <div className="space-y-3 ml-7">
                    <p className="text-xs text-gray-600">
                      AI will analyze your API to suggest intelligent entity relationships, optimize field mappings, and provide schema recommendations.
                    </p>
                    
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Domain/Industry (optional)
                        </label>
                        <input
                          type="text"
                          value={domain}
                          onChange={(e) => setDomain(e.target.value)}
                          placeholder="e.g., Healthcare, E-commerce, Finance"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Business Goals (optional)
                        </label>
                        <div className="space-y-2">
                          {businessGoals.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {businessGoals.map((goal, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800"
                                >
                                  {goal}
                                  <button
                                    type="button"
                                    onClick={() => setBusinessGoals(goals => goals.filter((_, i) => i !== index))}
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
                                if (e.key === 'Enter' && newBusinessGoal.trim()) {
                                  setBusinessGoals(goals => [...goals, newBusinessGoal.trim()]);
                                  setNewBusinessGoal('');
                                }
                              }}
                              placeholder="Add a business goal..."
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (newBusinessGoal.trim()) {
                                  setBusinessGoals(goals => [...goals, newBusinessGoal.trim()]);
                                  setNewBusinessGoal('');
                                }
                              }}
                              className="px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                              disabled={!newBusinessGoal.trim()}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
                onClick={handleParseSchema}
                disabled={loading || !kbId || (uploadMethod === 'file' && !file) || (uploadMethod === 'url' && !apiUrl) || (uploadMethod === 'paste' && !specContent)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>{loadingMessage}</span>
                  </>
                ) : (
                  <>
                    <span>Parse & Generate Schema</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2: Preview Generated Schema */}
          {currentStep === 'preview' && parsedSchema && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Generated Schema Preview</h3>
                
                {/* API Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-blue-900 mb-2">API Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700 font-medium">Title:</span> {parsedSchema.api_info.title}
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Version:</span> {parsedSchema.api_info.version}
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Endpoints:</span> {parsedSchema.api_info.endpoints_found}
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Schemas:</span> {parsedSchema.api_info.schemas_found}
                    </div>
                  </div>
                  {parsedSchema.api_info.description && (
                    <p className="text-blue-800 mt-2">{parsedSchema.api_info.description}</p>
                  )}
                </div>

                {/* LLM Insights */}
                {parsedSchema.llm_insights && (
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-purple-900 mb-3 flex items-center space-x-2">
                      <Settings className="w-5 h-5" />
                      <span>🧠 AI Enhancement Insights</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div className="flex items-center justify-between p-2 bg-white/50 rounded">
                        <span className="text-purple-700 font-medium">Confidence Score:</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full" 
                              style={{ width: `${parsedSchema.llm_insights.confidence * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-purple-800 font-semibold">
                            {(parsedSchema.llm_insights.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-white/50 rounded">
                        <span className="text-purple-700 font-medium">Enhanced Nodes:</span>
                        <span className="text-purple-800 font-semibold">{parsedSchema.llm_insights.enhanced_nodes}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-white/50 rounded">
                        <span className="text-purple-700 font-medium">Smart Relationships:</span>
                        <span className="text-purple-800 font-semibold">{parsedSchema.llm_insights.intelligent_relationships}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-white/50 rounded">
                        <span className="text-purple-700 font-medium">Field Suggestions:</span>
                        <span className="text-purple-800 font-semibold">{parsedSchema.llm_insights.field_suggestions}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-white/50 rounded">
                        <span className="text-purple-700 font-medium">Optimizations:</span>
                        <span className="text-purple-800 font-semibold">{parsedSchema.llm_insights.optimizations}</span>
                      </div>
                    </div>
                    <div className="text-xs text-purple-700 bg-white/30 rounded p-2">
                      <strong>✨ AI Enhancement:</strong> This schema has been analyzed and enhanced with intelligent entity relationships, 
                      optimized field mappings, and business context understanding.
                    </div>
                  </div>
                )}

                {/* Generated Schema */}
                <div className="border border-gray-200 rounded-lg">
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <h4 className="font-medium text-gray-900">Generated Knowledge Graph Schema</h4>
                  </div>
                  <pre className="p-4 text-sm bg-gray-50 overflow-x-auto">
                    {JSON.stringify(parsedSchema.generated_schema, null, 2)}
                  </pre>
                </div>

                {/* Validation Warnings */}
                {parsedSchema.validation_warnings && parsedSchema.validation_warnings.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <span className="text-yellow-800 font-medium">Validation Warnings</span>
                    </div>
                    <ul className="text-yellow-700 text-sm space-y-1">
                      {parsedSchema.validation_warnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setCurrentStep('upload')}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Back
                </button>
                <button
                  onClick={handleRegisterSchema}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Registering...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Register Custom Connector</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
