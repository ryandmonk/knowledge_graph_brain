import { useState } from 'react';
import { AlertTriangle, RefreshCw, Clock, HelpCircle, ExternalLink } from 'lucide-react';
import { type EnhancedError, formatErrorForDisplay, globalRetryManager } from '../utils/errorHandling';

interface EnhancedErrorDisplayProps {
  error: EnhancedError;
  onRetry?: () => void;
  onDismiss?: () => void;
  operationId: string;
}

export function EnhancedErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss, 
  operationId 
}: EnhancedErrorDisplayProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const displayInfo = formatErrorForDisplay(error);
  const attemptCount = globalRetryManager.getAttemptCount(operationId);
  const canRetry = error.canRetry && onRetry && globalRetryManager.shouldRetry(error, operationId);

  const handleRetry = async () => {
    if (!onRetry || !canRetry) return;

    setIsRetrying(true);
    globalRetryManager.recordAttempt(operationId);
    
    try {
      // Wait for retry delay if specified
      if (error.retryDelay) {
        await new Promise(resolve => setTimeout(resolve, error.retryDelay));
      }
      
      await onRetry();
      globalRetryManager.reset(operationId);
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    } finally {
      setIsRetrying(false);
    }
  };

  const getSeverityColors = () => {
    switch (error.severity) {
      case 'critical':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: 'text-red-500',
          button: 'bg-red-600 hover:bg-red-700'
        };
      case 'high':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          icon: 'text-red-500',
          button: 'bg-red-600 hover:bg-red-700'
        };
      case 'medium':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          text: 'text-orange-700',
          icon: 'text-orange-500',
          button: 'bg-orange-600 hover:bg-orange-700'
        };
      case 'low':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-700',
          icon: 'text-yellow-500',
          button: 'bg-yellow-600 hover:bg-yellow-700'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-700',
          icon: 'text-gray-500',
          button: 'bg-gray-600 hover:bg-gray-700'
        };
    }
  };

  const colors = getSeverityColors();

  return (
    <div className={`mb-6 p-4 ${colors.bg} ${colors.border} border rounded-lg`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <AlertTriangle className={`w-5 h-5 ${colors.icon}`} />
          <div>
            <h3 className={`font-medium ${colors.text}`}>{displayInfo.title}</h3>
            {error.code && (
              <p className={`text-sm ${colors.text} opacity-75`}>Error Code: {error.code}</p>
            )}
          </div>
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`${colors.text} hover:opacity-75 transition-opacity`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Main Message */}
      <p className={`${colors.text} mb-4`}>{displayInfo.message}</p>

      {/* Suggestions */}
      <div className="mb-4">
        <h4 className={`text-sm font-medium ${colors.text} mb-2 flex items-center space-x-1`}>
          <HelpCircle className="w-4 h-4" />
          <span>What you can try:</span>
        </h4>
        <ul className={`space-y-1 ${colors.text} text-sm`}>
          {error.suggestions.map((suggestion, index) => (
            <li key={index} className="flex items-start space-x-2">
              <span className="text-xs mt-1">•</span>
              <span>{suggestion}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {canRetry && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className={`flex items-center space-x-2 px-3 py-2 ${colors.button} text-white rounded-lg disabled:opacity-50 transition-colors text-sm`}
            >
              <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Retrying...' : 'Try Again'}</span>
            </button>
          )}

          {error.retryDelay && isRetrying && (
            <div className={`flex items-center space-x-1 ${colors.text} text-sm`}>
              <Clock className="w-4 h-4" />
              <span>Waiting {Math.ceil(error.retryDelay / 1000)}s...</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {attemptCount > 0 && (
            <span className={`text-xs ${colors.text} opacity-75`}>
              Attempt {attemptCount + 1} of 4
            </span>
          )}

          <button
            onClick={() => setShowDetails(!showDetails)}
            className={`text-xs ${colors.text} hover:opacity-75 transition-opacity`}
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
      </div>

      {/* Technical Details */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-current border-opacity-20">
          <div className="space-y-2 text-xs">
            <div>
              <span className={`font-medium ${colors.text}`}>Type:</span>{' '}
              <span className={`${colors.text} opacity-75`}>{error.type}</span>
            </div>
            
            <div>
              <span className={`font-medium ${colors.text}`}>Time:</span>{' '}
              <span className={`${colors.text} opacity-75`}>
                {error.context.timestamp.toLocaleString()}
              </span>
            </div>

            {error.context.kb_id && (
              <div>
                <span className={`font-medium ${colors.text}`}>Knowledge Base:</span>{' '}
                <span className={`${colors.text} opacity-75`}>{error.context.kb_id}</span>
              </div>
            )}

            {error.context.query && (
              <div>
                <span className={`font-medium ${colors.text}`}>Query:</span>{' '}
                <span className={`${colors.text} opacity-75`}>
                  {error.context.query.length > 100 
                    ? `${error.context.query.substring(0, 100)}...` 
                    : error.context.query
                  }
                </span>
              </div>
            )}

            {error.details && (
              <details className="mt-2">
                <summary className={`cursor-pointer ${colors.text} hover:opacity-75`}>
                  Technical Error Details
                </summary>
                <pre className={`mt-2 text-xs ${colors.text} bg-black bg-opacity-5 p-2 rounded overflow-x-auto`}>
                  {error.details}
                </pre>
              </details>
            )}
          </div>

          {/* Help Links */}
          <div className="mt-3 pt-3 border-t border-current border-opacity-20">
            <div className="flex flex-wrap gap-2">
              <a
                href="/docs/troubleshooting"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center space-x-1 text-xs ${colors.text} hover:opacity-75 transition-opacity`}
              >
                <ExternalLink className="w-3 h-3" />
                <span>Troubleshooting Guide</span>
              </a>
              
              <a
                href="/support"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center space-x-1 text-xs ${colors.text} hover:opacity-75 transition-opacity`}
              >
                <ExternalLink className="w-3 h-3" />
                <span>Contact Support</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
