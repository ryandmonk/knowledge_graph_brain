import { useState, useEffect } from 'react';

interface SecurityCheck {
  id: string;
  name: string;
  status: 'pass' | 'warning' | 'fail';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation?: string;
  last_checked: number;
  details?: any;
}

interface SecurityMetrics {
  overall_score: number;
  total_checks: number;
  passed_checks: number;
  warning_checks: number;
  failed_checks: number;
  critical_issues: number;
  security_trends: Array<{ date: string; score: number }>;
  compliance_status: {
    [framework: string]: {
      score: number;
      checks_passed: number;
      total_checks: number;
    };
  };
}

interface VulnerabilityReport {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  affected_components: string[];
  mitigation: string;
  discovered_at: number;
  status: 'open' | 'in_progress' | 'resolved';
}

export function SecurityDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'checks' | 'compliance' | 'vulnerabilities'>('overview');
  const [securityChecks, setSecurityChecks] = useState<SecurityCheck[]>([]);
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<VulnerabilityReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runningScans, setRunningScans] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSecurityData();
  }, [activeTab]);

  const loadSecurityData = async () => {
    setLoading(true);
    setError(null);

    try {
      const endpoints = {
        overview: '/api/security/metrics',
        checks: '/api/security/checks',
        compliance: '/api/security/compliance',
        vulnerabilities: '/api/security/vulnerabilities'
      };

      const response = await fetch(endpoints[activeTab]);
      
      if (!response.ok) {
        throw new Error(`Failed to load security ${activeTab} data`);
      }

      const data = await response.json();

      switch (activeTab) {
        case 'overview':
          setSecurityMetrics(data.metrics || null);
          break;
        case 'checks':
          setSecurityChecks(data.checks || []);
          break;
        case 'compliance':
          setSecurityMetrics(data.metrics || null);
          break;
        case 'vulnerabilities':
          setVulnerabilities(data.vulnerabilities || []);
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  const runSecurityScan = async (scanType: string) => {
    setRunningScans(prev => new Set([...prev, scanType]));
    
    try {
      const response = await fetch('/api/security/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ scan_type: scanType })
      });

      if (response.ok) {
        // Reload data after scan
        setTimeout(() => {
          loadSecurityData();
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to run security scan:', err);
    } finally {
      setRunningScans(prev => {
        const newSet = new Set(prev);
        newSet.delete(scanType);
        return newSet;
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'fail': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Security Dashboard</h2>
          <p className="text-gray-600 mt-1">Monitor security posture and compliance status</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => runSecurityScan('comprehensive')}
            disabled={runningScans.has('comprehensive')}
            className="btn-secondary"
          >
            {runningScans.has('comprehensive') ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Running Scan...
              </>
            ) : (
              'Run Security Scan'
            )}
          </button>
          <button onClick={loadSecurityData} className="btn-primary">
            Refresh
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: 'Security Overview', icon: '🛡️' },
            { key: 'checks', label: 'Security Checks', icon: '🔍' },
            { key: 'compliance', label: 'Compliance', icon: '📋' },
            { key: 'vulnerabilities', label: 'Vulnerabilities', icon: '🚨' }
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
              <h3 className="text-sm font-medium text-red-800">Error Loading Security Data</h3>
              <p className="mt-2 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading security data...</span>
        </div>
      ) : (
        <>
          {/* Security Overview Tab */}
          {activeTab === 'overview' && securityMetrics && (
            <div className="space-y-6">
              {/* Security Score Cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="card p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Security Score</h3>
                  <p className={`text-3xl font-bold ${getScoreColor(securityMetrics.overall_score)}`}>
                    {securityMetrics.overall_score}
                  </p>
                  <div className="text-xs text-gray-500 mt-1">/100</div>
                </div>
                <div className="card p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Passed Checks</h3>
                  <p className="text-3xl font-bold text-green-600">{securityMetrics.passed_checks}</p>
                  <div className="text-xs text-gray-500 mt-1">of {securityMetrics.total_checks}</div>
                </div>
                <div className="card p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Warnings</h3>
                  <p className="text-3xl font-bold text-yellow-600">{securityMetrics.warning_checks}</p>
                  <div className="text-xs text-gray-500 mt-1">Need attention</div>
                </div>
                <div className="card p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Failed Checks</h3>
                  <p className="text-3xl font-bold text-red-600">{securityMetrics.failed_checks}</p>
                  <div className="text-xs text-gray-500 mt-1">Must fix</div>
                </div>
                <div className="card p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Critical Issues</h3>
                  <p className="text-3xl font-bold text-red-600">{securityMetrics.critical_issues}</p>
                  <div className="text-xs text-gray-500 mt-1">Immediate attention</div>
                </div>
              </div>

              {/* Security Trends */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Security Score Trends</h3>
                <div className="space-y-2">
                  {securityMetrics.security_trends.map((trend, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{trend.date}</span>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="bg-blue-200 h-2 rounded"
                          style={{ width: `${Math.max(10, (trend.score / 100) * 200)}px` }}
                        />
                        <span className={`text-sm font-medium w-8 text-right ${getScoreColor(trend.score)}`}>
                          {trend.score}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Security Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { 
                      title: 'Configuration Audit', 
                      description: 'Review and validate configuration security',
                      action: 'configuration',
                      icon: '⚙️'
                    },
                    { 
                      title: 'Access Control Review', 
                      description: 'Check user permissions and roles',
                      action: 'access_control',
                      icon: '👥'
                    },
                    { 
                      title: 'Vulnerability Scan', 
                      description: 'Scan for known security vulnerabilities',
                      action: 'vulnerability',
                      icon: '🔍'
                    }
                  ].map((action) => (
                    <div key={action.action} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">{action.icon}</span>
                        <h4 className="font-medium text-gray-900">{action.title}</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{action.description}</p>
                      <button
                        onClick={() => runSecurityScan(action.action)}
                        disabled={runningScans.has(action.action)}
                        className="btn-secondary text-sm w-full"
                      >
                        {runningScans.has(action.action) ? 'Running...' : 'Run Check'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Security Checks Tab */}
          {activeTab === 'checks' && (
            <div className="space-y-4">
              {securityChecks.map((check) => (
                <div key={check.id} className="bg-white shadow rounded-lg p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(check.status)}`}>
                          {check.status.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(check.severity)}`}>
                          {check.severity.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          Last checked: {formatTimestamp(check.last_checked)}
                        </span>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">{check.name}</h3>
                      <p className="text-gray-600 mt-1">{check.description}</p>
                      {check.recommendation && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-sm text-blue-800">
                            <strong>Recommendation:</strong> {check.recommendation}
                          </p>
                        </div>
                      )}
                      {check.details && (
                        <div className="mt-3">
                          <details className="text-sm">
                            <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                              View Details
                            </summary>
                            <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                              {JSON.stringify(check.details, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <button
                        onClick={() => runSecurityScan(check.id)}
                        disabled={runningScans.has(check.id)}
                        className="btn-secondary text-sm"
                      >
                        {runningScans.has(check.id) ? 'Checking...' : 'Re-check'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {securityChecks.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No security checks configured</p>
                </div>
              )}
            </div>
          )}

          {/* Compliance Tab */}
          {activeTab === 'compliance' && securityMetrics && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(securityMetrics.compliance_status).map(([framework, status]) => (
                  <div key={framework} className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      {framework.replace(/_/g, ' ').toUpperCase()}
                    </h3>
                    <div className="text-center mb-4">
                      <div className={`text-4xl font-bold ${getScoreColor(status.score)}`}>
                        {status.score}%
                      </div>
                      <div className="text-sm text-gray-500">Compliance Score</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Passed Checks:</span>
                        <span className="font-medium">{status.checks_passed}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Checks:</span>
                        <span className="font-medium">{status.total_checks}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            status.score >= 80 ? 'bg-green-500' : 
                            status.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${status.score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vulnerabilities Tab */}
          {activeTab === 'vulnerabilities' && (
            <div className="space-y-4">
              {vulnerabilities.map((vuln) => (
                <div key={vuln.id} className={`border rounded-lg p-6 ${getSeverityColor(vuln.severity)}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(vuln.severity)}`}>
                          {vuln.severity.toUpperCase()}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                          {vuln.category}
                        </span>
                        <span className="text-xs text-gray-500">
                          Discovered: {formatTimestamp(vuln.discovered_at)}
                        </span>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">{vuln.title}</h3>
                      <p className="text-gray-600 mt-1">{vuln.description}</p>
                      <div className="mt-3">
                        <h4 className="text-sm font-medium text-gray-900">Affected Components:</h4>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {vuln.affected_components.map((component, index) => (
                            <span key={index} className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                              {component}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                        <h4 className="text-sm font-medium text-blue-900">Mitigation:</h4>
                        <p className="text-sm text-blue-800 mt-1">{vuln.mitigation}</p>
                      </div>
                    </div>
                    <div className="ml-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        vuln.status === 'resolved' ? 'bg-green-100 text-green-800' :
                        vuln.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {vuln.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {vulnerabilities.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-green-600 mb-4">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Vulnerabilities Detected</h3>
                  <p className="text-gray-500">No security vulnerabilities found in the system</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
