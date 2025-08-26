import { useState, useEffect } from 'react';
import { api, type SystemStatus } from '../utils/api';

export function Dashboard() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSystemStatus();
  }, []);

  const loadSystemStatus = async () => {
    try {
      setLoading(true);
      const status = await api.getSystemStatus();
      setSystemStatus(status);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load system status');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading system status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Dashboard Error</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={loadSystemStatus} className="btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">System Dashboard</h1>
        <button onClick={loadSystemStatus} className="btn-secondary">
          Refresh
        </button>
      </div>

      {systemStatus && (
        <>
          {/* System Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Health Score</h3>
              <p className="text-3xl font-bold text-gray-900">{systemStatus.health_score}/100</p>
            </div>
            <div className="card p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Knowledge Bases</h3>
              <p className="text-3xl font-bold text-gray-900">{systemStatus.total_kbs}</p>
            </div>
            <div className="card p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Nodes</h3>
              <p className="text-3xl font-bold text-gray-900">{systemStatus.total_nodes?.toLocaleString() || 0}</p>
            </div>
            <div className="card p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Relationships</h3>
              <p className="text-3xl font-bold text-gray-900">{systemStatus.total_relationships?.toLocaleString() || 0}</p>
            </div>
          </div>

          {/* Knowledge Bases */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Knowledge Bases</h2>
            {systemStatus.knowledge_bases.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No knowledge bases found.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Use the setup wizard to create your first knowledge base.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {systemStatus.knowledge_bases.map((kb) => (
                  <div key={kb.kb_id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{kb.kb_id}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {kb.total_nodes} nodes, {kb.total_relationships} relationships
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
                        kb.health_status === 'healthy' ? 'status-healthy' :
                        kb.health_status === 'warning' ? 'status-warning' : 'status-error'
                      }`}>
                        {kb.health_status}
                      </span>
                    </div>
                    {kb.sources.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-600">Sources:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {kb.sources.map((source) => (
                            <span key={source.source_id} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              {source.source_id}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
