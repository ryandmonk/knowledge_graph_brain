/**
 * Enhanced Error Handling for Knowledge Graph Brain
 * Provides specific error categorization and recovery suggestions
 */

export interface ErrorContext {
  kb_id?: string;
  query?: string;
  timestamp: Date;
  userAgent?: string;
  operation?: string;
}

export interface EnhancedError {
  type: 'network' | 'api' | 'validation' | 'timeout' | 'parsing' | 'authorization' | 'knowledge-base' | 'unknown';
  code?: string;
  message: string;
  userMessage: string;
  details?: string;
  suggestions: string[];
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  canRetry: boolean;
  retryDelay?: number;
}

// Error categorization patterns
const ERROR_PATTERNS = {
  network: [
    /network error/i,
    /connection (refused|timeout|reset)/i,
    /failed to fetch/i,
    /cors/i,
    /net::/i
  ],
  timeout: [
    /timeout/i,
    /request timed out/i,
    /deadline exceeded/i,
    /took too long/i
  ],
  authorization: [
    /unauthorized/i,
    /authentication/i,
    /forbidden/i,
    /invalid (token|key|credentials)/i,
    /(401|403)/
  ],
  validation: [
    /validation error/i,
    /invalid (input|format|syntax)/i,
    /schema error/i,
    /malformed/i
  ],
  knowledgeBase: [
    /knowledge base (not found|invalid)/i,
    /kb_id/i,
    /invalid knowledge base/i,
    /knowledge base does not exist/i
  ],
  parsing: [
    /parse error/i,
    /invalid json/i,
    /unexpected token/i,
    /syntax error/i
  ],
  api: [
    /(500|502|503|504)/,
    /internal server error/i,
    /service unavailable/i,
    /bad gateway/i
  ]
};

export function categorizeError(error: Error | string, context: Partial<ErrorContext> = {}): EnhancedError {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const fullContext: ErrorContext = {
    timestamp: new Date(),
    userAgent: navigator.userAgent,
    ...context
  };

  // Determine error type based on patterns
  let errorType: EnhancedError['type'] = 'unknown';
  for (const [type, patterns] of Object.entries(ERROR_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(errorMessage))) {
      errorType = type as EnhancedError['type'];
      break;
    }
  }

  // Generate user-friendly message and suggestions based on error type
  const errorInfo = getErrorInfo(errorType, errorMessage, fullContext);

  return {
    type: errorType,
    message: errorMessage,
    userMessage: errorInfo.userMessage,
    details: typeof error === 'object' ? error.stack : undefined,
    suggestions: errorInfo.suggestions,
    context: fullContext,
    severity: errorInfo.severity,
    canRetry: errorInfo.canRetry,
    retryDelay: errorInfo.retryDelay,
    code: extractErrorCode(errorMessage)
  };
}

function getErrorInfo(type: EnhancedError['type'], _message: string, _context: ErrorContext) {
  switch (type) {
    case 'network':
      return {
        userMessage: 'Unable to connect to the Knowledge Graph Brain service. Please check your internet connection.',
        suggestions: [
          'Check your internet connection',
          'Verify the service is accessible',
          'Try refreshing the page',
          'Contact your system administrator if the problem persists'
        ],
        severity: 'high' as const,
        canRetry: true,
        retryDelay: 3000
      };

    case 'timeout':
      return {
        userMessage: 'The query is taking longer than expected. Complex queries can take up to 2 minutes.',
        suggestions: [
          'Wait a moment and try again',
          'Try simplifying your query',
          'Use more specific keywords',
          'Check if the knowledge base is large or busy'
        ],
        severity: 'medium' as const,
        canRetry: true,
        retryDelay: 5000
      };

    case 'authorization':
      return {
        userMessage: 'You don\'t have permission to access this knowledge base or your session has expired.',
        suggestions: [
          'Refresh the page to renew your session',
          'Contact your administrator for access',
          'Verify you\'re using the correct knowledge base',
          'Check if your permissions have changed'
        ],
        severity: 'high' as const,
        canRetry: false
      };

    case 'validation':
      return {
        userMessage: 'Your query contains invalid characters or formatting.',
        suggestions: [
          'Check for special characters in your query',
          'Try rephrasing your question',
          'Use simpler language',
          'Avoid very long questions'
        ],
        severity: 'low' as const,
        canRetry: true
      };

    case 'knowledge-base':
      return {
        userMessage: 'The selected knowledge base is not available or has been removed.',
        suggestions: [
          'Refresh the page to see available knowledge bases',
          'Select a different knowledge base',
          'Contact your administrator',
          'Check if the knowledge base was recently updated'
        ],
        severity: 'high' as const,
        canRetry: false
      };

    case 'parsing':
      return {
        userMessage: 'There was an issue processing the response from the knowledge base.',
        suggestions: [
          'Try asking the question again',
          'Use different wording',
          'Report this issue if it continues',
          'Try a simpler query first'
        ],
        severity: 'medium' as const,
        canRetry: true,
        retryDelay: 2000
      };

    case 'api':
      return {
        userMessage: 'The Knowledge Graph Brain service is temporarily unavailable.',
        suggestions: [
          'Wait a few minutes and try again',
          'Check the system status page',
          'Contact support if the issue persists',
          'Try using a different knowledge base'
        ],
        severity: 'critical' as const,
        canRetry: true,
        retryDelay: 10000
      };

    default:
      return {
        userMessage: 'An unexpected error occurred while processing your request.',
        suggestions: [
          'Try refreshing the page',
          'Restart your browser',
          'Clear your browser cache',
          'Contact support if the problem continues'
        ],
        severity: 'medium' as const,
        canRetry: true,
        retryDelay: 5000
      };
  }
}

function extractErrorCode(message: string): string | undefined {
  // Extract HTTP status codes
  const httpMatch = message.match(/\b(4\d{2}|5\d{2})\b/);
  if (httpMatch) return httpMatch[1];

  // Extract custom error codes (pattern: ERR_XXXXX)
  const customMatch = message.match(/\b(ERR_[A-Z_]+)\b/);
  if (customMatch) return customMatch[1];

  return undefined;
}

// Helper function to format error for display
export function formatErrorForDisplay(enhancedError: EnhancedError): {
  title: string;
  message: string;
  icon: string;
  color: string;
} {
  const severityConfig = {
    low: { icon: '⚠️', color: 'yellow' },
    medium: { icon: '❌', color: 'orange' },
    high: { icon: '🚨', color: 'red' },
    critical: { icon: '💥', color: 'red' }
  };

  const config = severityConfig[enhancedError.severity];
  
  return {
    title: `${config.icon} ${enhancedError.type.charAt(0).toUpperCase() + enhancedError.type.slice(1)} Error`,
    message: enhancedError.userMessage,
    icon: config.icon,
    color: config.color
  };
}

// Auto-retry logic
export class ErrorRetryManager {
  private retryAttempts = new Map<string, number>();
  private maxRetries = 3;

  shouldRetry(error: EnhancedError, operationId: string): boolean {
    if (!error.canRetry) return false;
    
    const attempts = this.retryAttempts.get(operationId) || 0;
    return attempts < this.maxRetries;
  }

  recordAttempt(operationId: string): number {
    const attempts = (this.retryAttempts.get(operationId) || 0) + 1;
    this.retryAttempts.set(operationId, attempts);
    return attempts;
  }

  reset(operationId: string): void {
    this.retryAttempts.delete(operationId);
  }

  getAttemptCount(operationId: string): number {
    return this.retryAttempts.get(operationId) || 0;
  }
}

// Global retry manager instance
export const globalRetryManager = new ErrorRetryManager();
