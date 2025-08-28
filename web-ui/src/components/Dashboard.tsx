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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Graph Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor your knowledge bases and system health</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={loadSystemStatus} className="btn-secondary">
            Refresh
          </button>
          <button 
            onClick={() => window.open('/ui/setup', '_blank')}
            className="btn-primary"
          >
            Setup Wizard
          </button>
        </div>
      </div>

      {systemStatus && (
        <>
          {/* System Overview */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="card p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Health Score</h3>
              <div className="flex items-center space-x-2">
                <p className="text-3xl font-bold text-gray-900">{systemStatus.health_score}</p>
                <span className="text-sm text-gray-500">/100</span>
              </div>
              <div className={`text-xs mt-1 ${
                systemStatus.health_score >= 80 ? 'text-green-600' :
                systemStatus.health_score >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {systemStatus.health_score >= 80 ? 'Excellent' :
                 systemStatus.health_score >= 60 ? 'Good' : 'Needs Attention'}
              </div>
            </div>
            <div className="card p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Knowledge Bases</h3>
              <p className="text-3xl font-bold text-gray-900">{systemStatus.total_kbs}</p>
              <div className="text-xs text-gray-500 mt-1">
                {systemStatus.total_kbs === 1 ? 'Active KB' : 'Active KBs'}
              </div>
            </div>
            <div className="card p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Nodes</h3>
              <p className="text-3xl font-bold text-gray-900">{systemStatus.total_nodes?.toLocaleString() || 0}</p>
              <div className="text-xs text-gray-500 mt-1">Entities</div>
            </div>
            <div className="card p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Relationships</h3>
              <p className="text-3xl font-bold text-gray-900">{systemStatus.total_relationships?.toLocaleString() || 0}</p>
              <div className="text-xs text-gray-500 mt-1">Connections</div>
            </div>
            <div className="card p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Active Runs</h3>
              <p className="text-3xl font-bold text-gray-900">{systemStatus.active_runs || 0}</p>
              <div className="text-xs text-gray-500 mt-1">
                {systemStatus.total_runs_completed || 0} completed
              </div>
            </div>
          </div>

          {/* System Health Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Health Score Details */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">System Health Details</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Neo4j Connection</span>
                  <span className={`text-sm font-medium ${
                    systemStatus.neo4j_connected ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {systemStatus.neo4j_connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Service Uptime</span>
                  <span className="text-sm font-medium text-gray-900">
                    {Math.floor(systemStatus.uptime_seconds / 3600)}h {Math.floor((systemStatus.uptime_seconds % 3600) / 60)}m
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Memory Usage</span>
                  <span className="text-sm font-medium text-gray-900">
                    {Math.round(systemStatus.memory_usage.heapUsed / (1024 * 1024))}MB
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Errors</span>
                  <span className={`text-sm font-medium ${
                    systemStatus.total_errors > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {systemStatus.total_errors || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button className="w-full btn-primary">
                  Run System Diagnostics
                </button>
                <button className="w-full btn-secondary">
                  Export System Report
                </button>
                <button className="w-full btn-secondary">
                  View Query History
                </button>
                <button className="w-full text-gray-600 hover:text-gray-900 py-2 px-4 border border-gray-300 rounded-lg transition-colors">
                  Manage Data Sources
                </button>
              </div>
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
                  <div key={kb.kb_id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{kb.kb_id}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
                            kb.health_status === 'healthy' ? 'status-healthy' :
                            kb.health_status === 'warning' ? 'status-warning' : 'status-error'
                          }`}>
                            {kb.health_status}
                          </span>
                        </div>
                        
                        {/* KB Statistics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-500">Nodes</p>
                            <p className="text-lg font-semibold text-gray-900">{kb.total_nodes?.toLocaleString() || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Relationships</p>
                            <p className="text-lg font-semibold text-gray-900">{kb.total_relationships?.toLocaleString() || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Sources</p>
                            <p className="text-lg font-semibold text-gray-900">{kb.sources.length}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Node Types</p>
                            <p className="text-lg font-semibold text-gray-900">{kb.node_types?.length || 0}</p>
                          </div>
                        </div>

                        {/* Last Sync Status */}
                        <div className="mb-3">
                          <p className="text-sm text-gray-500">Last Successful Sync</p>
                          <p className="text-sm text-gray-700">
                            {kb.last_successful_sync 
                              ? new Date(kb.last_successful_sync).toLocaleString()
                              : 'Never'
                            }
                          </p>
                        </div>

                        {/* Data Freshness */}
                        {kb.data_freshness_hours !== undefined && (
                          <div className="mb-3">
                            <p className="text-sm text-gray-500">Data Freshness</p>
                            <p className={`text-sm font-medium ${
                              kb.data_freshness_hours <= 24 ? 'text-green-600' :
                              kb.data_freshness_hours <= 168 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {kb.data_freshness_hours <= 1 ? 'Less than 1 hour ago' :
                               kb.data_freshness_hours <= 24 ? `${Math.round(kb.data_freshness_hours)} hours ago` :
                               `${Math.round(kb.data_freshness_hours / 24)} days ago`}
                            </p>
                          </div>
                        )}

                        {/* Error Status */}
                        {kb.last_error && (
                          <div className="mb-3">
                            <p className="text-sm text-red-600 font-medium">Last Error</p>
                            <p className="text-sm text-red-700">{kb.last_error}</p>
                            <p className="text-xs text-gray-500">
                              {kb.last_error_at && new Date(kb.last_error_at).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sources Details */}
                    {/* Sources Details */}
                    {kb.sources.length > 0 && (
                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-sm font-medium text-gray-600 mb-3">Data Sources ({kb.sources.length})</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {kb.sources.map((source) => (
                            <div key={source.source_id} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium text-sm text-gray-900">{source.source_id}</span>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  source.last_sync_status === 'completed' ? 'bg-green-100 text-green-800' :
                                  source.last_sync_status === 'running' ? 'bg-blue-100 text-blue-800' :
                                  source.last_sync_status === 'error' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {source.last_sync_status || 'pending'}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 space-y-1">
                                <div>Records: {source.records_count?.toLocaleString() || 0}</div>
                                <div>
                                  Last sync: {source.last_sync_at 
                                    ? new Date(source.last_sync_at).toLocaleDateString()
                                    : 'Never'
                                  }
                                </div>
                                {source.last_error && (
                                  <div className="text-red-600">
                                    Error: {source.last_error}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* KB Actions */}
                    <div className="border-t border-gray-100 pt-4 mt-4">
                      <div className="flex space-x-3">
                        <button className="btn-primary text-sm">
                          Query Knowledge Base
                        </button>
                        <button className="btn-secondary text-sm">
                          View Details
                        </button>
                        <button className="text-sm text-gray-600 hover:text-gray-900">
                          Sync Data
                        </button>
                      </div>
                    </div>
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
