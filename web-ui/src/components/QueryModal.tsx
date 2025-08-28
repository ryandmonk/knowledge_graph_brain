import { useState } from 'react';
import { api, type GraphRAGResponse } from '../utils/api';

interface QueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  kb_id: string;
  kb_name: string;
}

export function QueryModal({ isOpen, onClose, kb_id, kb_name }: QueryModalProps) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<GraphRAGResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showProvenance, setShowProvenance] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await api.askQuestion(question, kb_id);
      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process question');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setQuestion('');
    setResponse(null);
    setError(null);
    setShowProvenance(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Query Knowledge Base</h2>
            <p className="text-sm text-gray-600 mt-1">Ask questions about: {kb_name}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Question Input */}
          <form onSubmit={handleSubmit} className="mb-6">
            <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
              Ask a question
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g., What products are available? Who are the key authors?"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  'Ask'
                )}
              </button>
            </div>
          </form>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-700 font-medium">Error</span>
              </div>
              <p className="text-red-600 mt-1">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-lg font-medium text-gray-700">Processing with GraphRAG agent...</p>
              <p className="text-sm text-gray-500 mt-2">This may take up to 2 minutes for complex queries</p>
              <p className="text-xs text-gray-400 mt-1">Analyzing knowledge graph and generating citations...</p>
            </div>
          )}

          {/* Response Display */}
          {response && (
            <div className="space-y-6">
              {/* Answer Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📝 Answer</h3>
                <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {response.answer}
                </div>
                
                {/* Confidence Score */}
                <div className="mt-4 flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-600">Confidence:</span>
                    <span className={`text-sm font-semibold ${
                      response.confidence_breakdown.overall_confidence >= 0.8 ? 'text-green-600' :
                      response.confidence_breakdown.overall_confidence >= 0.6 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {Math.round(response.confidence_breakdown.overall_confidence * 100)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    ({response.citations.length} citations)
                  </div>
                </div>
              </div>

              {/* Citations Section */}
              {response.citations.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🔗 Citations & Evidence</h3>
                  <div className="space-y-4">
                    {response.citations.map((citation, index) => (
                      <div key={index} className="bg-white border border-yellow-300 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                              {citation.node_id}
                            </span>
                            <div className="flex space-x-1">
                              {citation.node_type.map((type, i) => (
                                <span key={i} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  {type}
                                </span>
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {Math.round(citation.confidence * 100)}% confidence
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{citation.supporting_evidence}</p>
                        {citation.source_data && (
                          <details className="text-xs text-gray-600">
                            <summary className="cursor-pointer hover:text-gray-800">View source data</summary>
                            <pre className="mt-2 bg-gray-100 p-2 rounded overflow-x-auto">
                              {JSON.stringify(citation.source_data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Provenance Chain - Show/Hide Toggle */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">⚙️ Query Execution Details</h3>
                  <button
                    onClick={() => setShowProvenance(!showProvenance)}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {showProvenance ? 'Hide' : 'Show'} Query Details
                  </button>
                </div>
                
                {showProvenance && (
                  <div className="space-y-4">
                    {response.provenance_chain.map((step, index) => (
                      <div key={index} className="bg-white border border-gray-300 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded">
                            Step {step.step}
                          </span>
                          <span className="text-sm font-medium text-gray-700">{step.tool_used}</span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{step.action}</p>
                        
                        {/* Query Executed */}
                        <div className="mb-2">
                          <span className="text-xs font-medium text-gray-600">Query:</span>
                          <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                            {step.query_executed}
                          </pre>
                        </div>
                        
                        {/* Results Summary */}
                        <div className="flex justify-between items-center text-xs text-gray-600">
                          <span>Results: {step.results_found}</span>
                          {step.key_findings.length > 0 && (
                            <details>
                              <summary className="cursor-pointer hover:text-gray-800">
                                Key findings ({step.key_findings.length})
                              </summary>
                              <ul className="mt-2 space-y-1">
                                {step.key_findings.map((finding, i) => (
                                  <li key={i} className="bg-gray-50 p-1 rounded text-xs">
                                    {finding}
                                  </li>
                                ))}
                              </ul>
                            </details>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Confidence Breakdown */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Confidence Analysis</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div className="text-center">
                          <div className="text-xs text-gray-600">Semantic</div>
                          <div className="text-sm font-semibold">
                            {Math.round(response.confidence_breakdown.semantic_confidence * 100)}%
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-600">Graph</div>
                          <div className="text-sm font-semibold">
                            {Math.round(response.confidence_breakdown.graph_confidence * 100)}%
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-600">Synthesis</div>
                          <div className="text-sm font-semibold">
                            {Math.round(response.confidence_breakdown.synthesis_confidence * 100)}%
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-600">Overall</div>
                          <div className="text-sm font-bold text-blue-600">
                            {Math.round(response.confidence_breakdown.overall_confidence * 100)}%
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 italic">
                        {response.confidence_breakdown.reasoning}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
