import { useState, useEffect } from 'react';

interface AuditEvent {
  id: string;
  timestamp: number;
  event_type: string;
  user_id?: string;
  resource: string;
  action: string;
  success: boolean;
  details?: any;
  ip_address?: string;
  user_agent?: string;
}

interface ConfigChange {
  id: string;
  timestamp: number;
  user_id?: string;
  component: string;
  field: string;
  old_value: any;
  new_value: any;
  reason?: string;
  ip_address?: string;
}

interface SecurityAlert {
  id: string;
  timestamp: number;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details: any;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: number;
}

interface AuditMetrics {
  total_events: number;
  config_changes: number;
  security_alerts: number;
  failed_logins: number;
  successful_logins: number;
  permission_denials: number;
  events_by_type: Record<string, number>;
  events_by_day: Array<{ date: string; count: number }>;
}

export function ConfigurationAudit() {
  const [activeTab, setActiveTab] = useState<'history' | 'events' | 'alerts' | 'analytics'>('history');
  const [configChanges, setConfigChanges] = useState<ConfigChange[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [auditMetrics, setAuditMetrics] = useState<AuditMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    loadAuditData();
  }, [activeTab, timeRange]);

  const loadAuditData = async () => {
    setLoading(true);
    setError(null);

    try {
      const endpoints = {
        history: '/api/audit/config-changes',
        events: '/api/audit/events',
        alerts: '/api/audit/security-alerts',
        analytics: '/api/audit/metrics'
      };

      const response = await fetch(`${endpoints[activeTab]}?timeRange=${timeRange}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load ${activeTab} data`);
      }

      const data = await response.json();

      switch (activeTab) {
        case 'history':
          setConfigChanges(data.changes || []);
          break;
        case 'events':
          setAuditEvents(data.events || []);
          break;
        case 'alerts':
          setSecurityAlerts(data.alerts || []);
          break;
        case 'analytics':
          setAuditMetrics(data.metrics || null);
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit data');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string' && value.includes('password')) return '••••••••';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getEventTypeColor = (eventType: string) => {
    if (eventType.includes('failed') || eventType.includes('error')) {
      return 'text-red-600 bg-red-50';
    }
    if (eventType.includes('success') || eventType.includes('login')) {
      return 'text-green-600 bg-green-50';
    }
    if (eventType.includes('warning') || eventType.includes('denied')) {
      return 'text-yellow-600 bg-yellow-50';
    }
    return 'text-blue-600 bg-blue-50';
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/audit/security-alerts/${alertId}/resolve`, {
        method: 'POST'
      });

      if (response.ok) {
        loadAuditData();
      }
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Configuration Audit & Security</h2>
          <p className="text-gray-600 mt-1">Monitor configuration changes, security events, and compliance</p>
        </div>
        <div className="flex space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
            className="input"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button onClick={loadAuditData} className="btn-secondary">
            Refresh
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'history', label: 'Configuration History', icon: '📋' },
            { key: 'events', label: 'Audit Events', icon: '📊' },
            { key: 'alerts', label: 'Security Alerts', icon: '🚨' },
            { key: 'analytics', label: 'Analytics', icon: '📈' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-1 ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="text-red-400">⚠️</div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Audit Data</h3>
              <p className="mt-2 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading audit data...</span>
        </div>
      ) : (
        <>
          {/* Configuration History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Configuration Changes</h3>
                  <p className="text-sm text-gray-500">Track all configuration modifications</p>
                </div>
                <div className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Timestamp
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Component
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Field
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Change
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {configChanges.map((change) => (
                          <tr key={change.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatTimestamp(change.timestamp)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                {change.component}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {change.field}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <div className="space-y-1">
                                <div className="text-red-600">
                                  <span className="text-xs">From:</span> {formatValue(change.old_value)}
                                </div>
                                <div className="text-green-600">
                                  <span className="text-xs">To:</span> {formatValue(change.new_value)}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {change.user_id || 'System'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {configChanges.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No configuration changes in selected time range</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Audit Events Tab */}
          {activeTab === 'events' && (
            <div className="space-y-4">
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Audit Events</h3>
                  <p className="text-sm text-gray-500">Authentication and authorization events</p>
                </div>
                <div className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Timestamp
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Event Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Resource
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {auditEvents.map((event) => (
                          <tr key={event.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatTimestamp(event.timestamp)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs ${getEventTypeColor(event.event_type)}`}>
                                {event.event_type.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {event.resource}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {event.user_id || 'Anonymous'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                event.success ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                              }`}>
                                {event.success ? 'SUCCESS' : 'FAILED'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {auditEvents.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No audit events in selected time range</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Security Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              {securityAlerts.map((alert) => (
                <div key={alert.id} className="bg-white shadow rounded-lg p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-500">{formatTimestamp(alert.timestamp)}</span>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mt-2">{alert.alert_type}</h3>
                      <p className="text-gray-600 mt-1">{alert.description}</p>
                      {alert.details && (
                        <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                          {JSON.stringify(alert.details, null, 2)}
                        </pre>
                      )}
                    </div>
                    <div className="ml-4">
                      {!alert.resolved ? (
                        <button
                          onClick={() => resolveAlert(alert.id)}
                          className="btn-secondary text-sm"
                        >
                          Mark Resolved
                        </button>
                      ) : (
                        <div className="text-sm text-green-600">
                          ✅ Resolved by {alert.resolved_by} at {formatTimestamp(alert.resolved_at!)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {securityAlerts.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-green-600 mb-4">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Security Alerts</h3>
                  <p className="text-gray-500">No security alerts in selected time range</p>
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && auditMetrics && (
            <div className="space-y-6">
              {/* Metrics Overview */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="card p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Total Events</h3>
                  <p className="text-3xl font-bold text-gray-900">{auditMetrics.total_events}</p>
                </div>
                <div className="card p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Config Changes</h3>
                  <p className="text-3xl font-bold text-blue-600">{auditMetrics.config_changes}</p>
                </div>
                <div className="card p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Security Alerts</h3>
                  <p className="text-3xl font-bold text-orange-600">{auditMetrics.security_alerts}</p>
                </div>
                <div className="card p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Failed Logins</h3>
                  <p className="text-3xl font-bold text-red-600">{auditMetrics.failed_logins}</p>
                </div>
                <div className="card p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Successful Logins</h3>
                  <p className="text-3xl font-bold text-green-600">{auditMetrics.successful_logins}</p>
                </div>
              </div>

              {/* Event Types Breakdown */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Events by Type</h3>
                <div className="space-y-3">
                  {Object.entries(auditMetrics.events_by_type).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{type.replace(/_/g, ' ').toUpperCase()}</span>
                      <span className="text-sm font-medium text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily Activity Chart */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Activity</h3>
                <div className="space-y-2">
                  {auditMetrics.events_by_day.map((day) => (
                    <div key={day.date} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{day.date}</span>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="bg-blue-200 h-2 rounded"
                          style={{ width: `${Math.max(10, (day.count / Math.max(...auditMetrics.events_by_day.map(d => d.count))) * 200)}px` }}
                        />
                        <span className="text-sm font-medium text-gray-900 w-8 text-right">{day.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
