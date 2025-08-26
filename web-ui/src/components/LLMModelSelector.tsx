import { useState, useEffect } from 'react';
import { ChevronDown, RefreshCw, CheckCircle, AlertCircle, Settings } from 'lucide-react';
import { api } from '../utils/api';
import type { OllamaModel, OllamaModelsResponse } from '../utils/api';

interface LLMModelSelectorProps {
  currentModel: string;
  onModelChange?: (model: string) => void;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export function LLMModelSelector({ 
  currentModel, 
  onModelChange, 
  className = '',
  size = 'medium'
}: LLMModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [selectedModel, setSelectedModel] = useState(currentModel);

  const fetchModels = async () => {
    setLoading(true);
    setError(null);
    try {
      const response: OllamaModelsResponse = await api.getAvailableModels();
      if (response.success) {
        setModels(response.models);
        setSelectedModel(response.current_model);
      } else {
        setError('Failed to fetch Ollama models');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch models');
    } finally {
      setLoading(false);
    }
  };

  const handleModelSelect = async (model: string) => {
    if (model === selectedModel) {
      setIsOpen(false);
      return;
    }

    setUpdating(true);
    setError(null);
    
    try {
      const result = await api.updateLLMModel(model);
      if (result.success) {
        setSelectedModel(model);
        setIsOpen(false);
        onModelChange?.(model);
        
        // Show success message with restart info
        if (result.requiresRestart) {
          // We could show a toast/notification here
          console.log(`Model updated successfully. Restart required for: ${result.affectedServices.join(', ')}`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update model');
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    if (isOpen && models.length === 0) {
      fetchModels();
    }
  }, [isOpen]);

  const sizeClasses = {
    small: 'text-xs px-2 py-1',
    medium: 'text-sm px-3 py-2', 
    large: 'text-base px-4 py-3'
  };

  const dropdownSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  if (error && !isOpen) {
    return (
      <div className={`inline-flex items-center space-x-2 text-red-600 ${sizeClasses[size]} ${className}`}>
        <AlertCircle className="w-4 h-4" />
        <span>Model loading failed</span>
        <button 
          onClick={fetchModels}
          className="text-blue-600 hover:text-blue-700"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={updating}
        className={`
          w-full flex items-center justify-between
          bg-white border border-gray-200 rounded-lg
          hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors duration-200
          ${sizeClasses[size]}
        `}
      >
        <div className="flex items-center space-x-2">
          <Settings className="w-4 h-4 text-gray-400" />
          <span className="font-mono text-gray-700">
            {updating ? 'Updating...' : selectedModel}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {updating && <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50">
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
            {/* Header */}
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <span className={`font-medium text-gray-700 ${dropdownSizeClasses[size]}`}>
                Select LLM Model
              </span>
              <button
                onClick={fetchModels}
                disabled={loading}
                className="text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Error State */}
            {error && (
              <div className="px-3 py-2 text-red-600 bg-red-50 border-b border-red-200">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className={dropdownSizeClasses[size]}>{error}</span>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="px-3 py-4 text-center text-gray-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                <span className={dropdownSizeClasses[size]}>Loading models...</span>
              </div>
            )}

            {/* Models List */}
            {!loading && models.length > 0 && (
              <div className="max-h-48 overflow-y-auto">
                {models.map((model) => (
                  <button
                    key={model.name}
                    onClick={() => handleModelSelect(model.name)}
                    disabled={updating}
                    className={`
                      w-full px-3 py-2 text-left hover:bg-gray-50 
                      disabled:opacity-50 disabled:cursor-not-allowed
                      flex items-center justify-between
                      ${model.name === selectedModel ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                      ${dropdownSizeClasses[size]}
                    `}
                  >
                    <div className="flex-1">
                      <div className="font-mono">{model.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Size: {formatBytes(model.size)} • Modified: {formatDate(model.modified_at)}
                      </div>
                    </div>
                    {model.name === selectedModel && (
                      <CheckCircle className="w-4 h-4 text-blue-600 ml-2" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && models.length === 0 && !error && (
              <div className="px-3 py-4 text-center text-gray-500">
                <span className={dropdownSizeClasses[size]}>No models found</span>
                <div className="text-xs mt-1">
                  Try running: <code className="bg-gray-100 px-1 rounded">ollama pull llama3.2</code>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                Current: <span className="font-mono">{selectedModel}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

// Helper functions
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Unknown';
  }
}
