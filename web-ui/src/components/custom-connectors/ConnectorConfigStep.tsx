import { useState } from 'react';
import { Settings, Key, Info } from 'lucide-react';

interface ConnectorConfigStepProps {
  data: any;
  onComplete: (stepData: any) => void;
  onPrevious: () => void;
}

export default function ConnectorConfigStep({ 
  data, 
  onComplete, 
  onPrevious 
}: ConnectorConfigStepProps) {
  const [config, setConfig] = useState({
    name: data.name || '',
    description: data.description || '',
    apiUrl: data.apiUrl || '',
    authType: 'none',
    apiKey: '',
    bearerToken: '',
    username: '',
    password: '',
    customHeaders: [{ key: '', value: '' }],
    enableLLM: true,
    confidenceThreshold: 0.8
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!config.name.trim()) {
      newErrors.name = 'Connector name is required';
    }

    if (!config.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!config.apiUrl.trim()) {
      newErrors.apiUrl = 'API base URL is required';
    } else if (!isValidUrl(config.apiUrl)) {
      newErrors.apiUrl = 'Please enter a valid URL';
    }

    if (config.authType === 'apiKey' && !config.apiKey.trim()) {
      newErrors.apiKey = 'API key is required';
    }

    if (config.authType === 'bearer' && !config.bearerToken.trim()) {
      newErrors.bearerToken = 'Bearer token is required';
    }

    if (config.authType === 'basic' && (!config.username.trim() || !config.password.trim())) {
      newErrors.basic = 'Username and password are required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onComplete({
        ...config,
        configuration: {
          authentication: {
            type: config.authType,
            ...(config.authType === 'apiKey' && { apiKey: config.apiKey }),
            ...(config.authType === 'bearer' && { bearerToken: config.bearerToken }),
            ...(config.authType === 'basic' && { 
              username: config.username, 
              password: config.password 
            })
          },
          headers: config.customHeaders.filter(h => h.key && h.value),
          llmEnhanced: config.enableLLM,
          confidenceThreshold: config.confidenceThreshold
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Configure Connector
        </h3>
        <p className="text-sm text-gray-600">
          Set up your connector name, authentication, and advanced options
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="flex items-center text-sm font-medium text-gray-900 mb-4">
            <Info className="w-4 h-4 mr-2" />
            Basic Information
          </h4>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Connector Name *
              </label>
              <input
                type="text"
                value={config.name}
                onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., My Custom API"
              />
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={config.description}
                onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                rows={3}
                placeholder="Describe what this connector does..."
              />
              {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Base URL *
              </label>
              <input
                type="url"
                value={config.apiUrl}
                onChange={(e) => setConfig(prev => ({ ...prev, apiUrl: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.apiUrl ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="https://api.example.com"
              />
              {errors.apiUrl && <p className="text-xs text-red-600 mt-1">{errors.apiUrl}</p>}
            </div>
          </div>
        </div>

        {/* Authentication */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="flex items-center text-sm font-medium text-gray-900 mb-4">
            <Key className="w-4 h-4 mr-2" />
            Authentication
          </h4>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Authentication Type
              </label>
              <select
                value={config.authType}
                onChange={(e) => setConfig(prev => ({ ...prev, authType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">No Authentication</option>
                <option value="apiKey">API Key</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
              </select>
            </div>

            {config.authType === 'apiKey' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key *
                </label>
                <input
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.apiKey ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your API key"
                />
                {errors.apiKey && <p className="text-xs text-red-600 mt-1">{errors.apiKey}</p>}
              </div>
            )}

            {config.authType === 'bearer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bearer Token *
                </label>
                <input
                  type="password"
                  value={config.bearerToken}
                  onChange={(e) => setConfig(prev => ({ ...prev, bearerToken: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.bearerToken ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your bearer token"
                />
                {errors.bearerToken && <p className="text-xs text-red-600 mt-1">{errors.bearerToken}</p>}
              </div>
            )}

            {config.authType === 'basic' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={config.username}
                    onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.basic ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={config.password}
                    onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.basic ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Password"
                  />
                </div>
                {errors.basic && <p className="text-xs text-red-600 mt-1 col-span-2">{errors.basic}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Advanced Options */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="flex items-center text-sm font-medium text-gray-900 mb-4">
            <Settings className="w-4 h-4 mr-2" />
            Advanced Options
          </h4>

          <div className="space-y-4">
            {/* LLM Enhancement */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Enable LLM Enhancement
                </label>
                <p className="text-xs text-gray-500">
                  Use AI to analyze and improve schema mapping
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.enableLLM}
                onChange={(e) => setConfig(prev => ({ ...prev, enableLLM: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            {config.enableLLM && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confidence Threshold
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={config.confidenceThreshold}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    confidenceThreshold: parseFloat(e.target.value) 
                  }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.1 (Low)</span>
                  <span className="font-medium">{config.confidenceThreshold}</span>
                  <span>1.0 (High)</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onPrevious}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Previous
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}
