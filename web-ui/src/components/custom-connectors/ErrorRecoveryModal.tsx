import { useState } from 'react';
import { AlertTriangle, RefreshCw, FileText, MessageCircle, ExternalLink, CheckCircle, X } from 'lucide-react';

interface ErrorDetails {
  type: 'validation' | 'network' | 'authentication' | 'parsing' | 'unknown';
  code?: string;
  message: string;
  details?: string;
  timestamp: Date;
  context?: Record<string, any>;
}

interface RecoveryAction {
  id: string;
  label: string;
  description: string;
  action: () => void | Promise<void>;
  variant: 'primary' | 'secondary' | 'danger';
}

interface ErrorRecoveryModalProps {
  isOpen: boolean;
  error: ErrorDetails;
  onClose: () => void;
  onRetry?: () => void;
  onSupport?: () => void;
  customActions?: RecoveryAction[];
}

const ERROR_SOLUTIONS = {
  validation: {
    title: 'Schema Validation Error',
    icon: <FileText className="w-6 h-6 text-red-500" />,
    suggestions: [
      'Check that all required fields are present',
      'Verify JSON syntax is correct',
      'Ensure field types match expected schema',
      'Review error message for specific field issues'
    ],
    links: [
      { label: 'Schema Documentation', url: '/docs/schema' },
      { label: 'Validation Rules', url: '/docs/validation' }
    ]
  },
  network: {
    title: 'Network Connection Error',
    icon: <AlertTriangle className="w-6 h-6 text-orange-500" />,
    suggestions: [
      'Check your internet connection',
      'Verify the API endpoint is accessible',
      'Confirm firewall settings allow the connection',
      'Try again in a few moments'
    ],
    links: [
      { label: 'Network Troubleshooting', url: '/docs/network' },
      { label: 'Service Status', url: '/status' }
    ]
  },
  authentication: {
    title: 'Authentication Error',
    icon: <AlertTriangle className="w-6 h-6 text-red-500" />,
    suggestions: [
      'Verify your API credentials are correct',
      'Check if your token has expired',
      'Ensure you have the required permissions',
      'Try re-authenticating with the service'
    ],
    links: [
      { label: 'Authentication Guide', url: '/docs/auth' },
      { label: 'API Key Management', url: '/docs/api-keys' }
    ]
  },
  parsing: {
    title: 'Data Parsing Error',
    icon: <FileText className="w-6 h-6 text-yellow-500" />,
    suggestions: [
      'Check the format of your input data',
      'Verify the API response structure matches expectations',
      'Ensure all required fields are present',
      'Review the schema mapping configuration'
    ],
    links: [
      { label: 'Data Format Guide', url: '/docs/formats' },
      { label: 'Schema Mapping', url: '/docs/mapping' }
    ]
  },
  unknown: {
    title: 'Unexpected Error',
    icon: <AlertTriangle className="w-6 h-6 text-gray-500" />,
    suggestions: [
      'Try refreshing the page',
      'Clear your browser cache',
      'Check if the service is experiencing issues',
      'Contact support if the problem persists'
    ],
    links: [
      { label: 'Troubleshooting Guide', url: '/docs/troubleshooting' },
      { label: 'Contact Support', url: '/support' }
    ]
  }
};

export default function ErrorRecoveryModal({
  isOpen,
  error,
  onClose,
  onRetry,
  onSupport,
  customActions = []
}: ErrorRecoveryModalProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [actionStates, setActionStates] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const solution = ERROR_SOLUTIONS[error.type] || ERROR_SOLUTIONS.unknown;

  const handleRetry = async () => {
    if (onRetry) {
      setIsRetrying(true);
      try {
        await onRetry();
        onClose();
      } catch (err) {
        // Error will be handled by parent component
      } finally {
        setIsRetrying(false);
      }
    }
  };

  const handleCustomAction = async (action: RecoveryAction) => {
    setActionStates(prev => ({ ...prev, [action.id]: true }));
    try {
      await action.action();
      if (action.variant === 'primary') {
        onClose();
      }
    } catch (err) {
      console.error('Custom action failed:', err);
    } finally {
      setActionStates(prev => ({ ...prev, [action.id]: false }));
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {solution.icon}
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{solution.title}</h2>
                <p className="text-sm text-gray-600">Error occurred at {formatTimestamp(error.timestamp)}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Error Details */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-medium text-red-900 mb-2">Error Message</h3>
            <p className="text-red-800">{error.message}</p>
            {error.details && (
              <details className="mt-3">
                <summary className="cursor-pointer text-red-700 hover:text-red-900">
                  Technical Details
                </summary>
                <pre className="mt-2 text-sm text-red-700 bg-red-100 p-2 rounded overflow-x-auto">
                  {error.details}
                </pre>
              </details>
            )}
            {error.code && (
              <p className="text-sm text-red-600 mt-2">Error Code: {error.code}</p>
            )}
          </div>

          {/* Context Information */}
          {error.context && Object.keys(error.context).length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Context Information</h3>
              <div className="space-y-1 text-sm text-gray-700">
                {Object.entries(error.context).map(([key, value]) => (
                  <div key={key} className="flex">
                    <span className="font-medium w-24">{key}:</span>
                    <span className="flex-1">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Solutions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-3">Suggested Solutions</h3>
            <ul className="space-y-2 text-blue-800">
              {solution.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Helpful Resources */}
          {solution.links.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Helpful Resources</h3>
              <div className="space-y-2">
                {solution.links.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Custom Actions */}
          {customActions.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-medium text-yellow-900 mb-3">Recovery Actions</h3>
              <div className="space-y-2">
                {customActions.map((action) => (
                  <div key={action.id} className="flex items-start space-x-3">
                    <button
                      onClick={() => handleCustomAction(action)}
                      disabled={actionStates[action.id]}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        action.variant === 'primary'
                          ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400'
                          : action.variant === 'danger'
                          ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400'
                          : 'bg-gray-600 text-white hover:bg-gray-700 disabled:bg-gray-400'
                      }`}
                    >
                      {actionStates[action.id] ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Working...</span>
                        </div>
                      ) : (
                        action.label
                      )}
                    </button>
                    <div className="flex-1">
                      <p className="text-sm text-yellow-800">{action.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex space-x-3">
              {onRetry && (
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                  <span>{isRetrying ? 'Retrying...' : 'Try Again'}</span>
                </button>
              )}
              
              {onSupport && (
                <button
                  onClick={onSupport}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Contact Support</span>
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
