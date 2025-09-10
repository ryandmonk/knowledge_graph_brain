import { useState, useEffect } from 'react';
import { Activity, Server, Zap, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

interface PerformanceMetrics {
  timestamp: number;
  cpu_usage: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  response_time_avg: number;
  error_rate: number;
  active_connections: number;
}

interface ServiceHealth {
  service_name: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  response_time: number;
  last_check: number;
  details: {
    version?: string;
    uptime?: number;
    error_message?: string;
    performance_score?: number;
  };
}

interface MonitoringData {
  systemStatus: any;
  performanceMetrics: PerformanceMetrics;
  serviceHealth: ServiceHealth[];
}

interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  timestamp: number;
  resolved?: boolean;
}

export function SystemMonitor() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  // Performance history for future chart implementation
  const [, setPerformanceHistory] = useState<PerformanceMetrics[]>([]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connect = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/monitoring`;
        
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('📊 Connected to real-time monitoring');
          setIsConnected(true);
          setConnectionError(null);
          reconnectAttempts = 0;
        };

        ws.onmessage = (event) => {
          try {
            const update = JSON.parse(event.data);
            handleMonitoringUpdate(update);
          } catch (error) {
            console.error('Failed to parse monitoring update:', error);
          }
        };

        ws.onclose = () => {
          console.log('📊 Monitoring connection closed');
          setIsConnected(false);
          
          // Attempt to reconnect
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            console.log(`📊 Reconnecting to monitoring in ${delay}ms (attempt ${reconnectAttempts})`);
            
            reconnectTimeout = setTimeout(connect, delay);
          } else {
            setConnectionError('Unable to establish monitoring connection after multiple attempts');
          }
        };

        ws.onerror = (error) => {
          console.error('📊 Monitoring WebSocket error:', error);
          setConnectionError('WebSocket connection error');
        };

      } catch (error) {
        console.error('📊 Failed to create monitoring connection:', error);
        setConnectionError('Failed to create WebSocket connection');
      }
    };

    const handleMonitoringUpdate = (update: any) => {
      switch (update.type) {
        case 'system_status':
          setMonitoringData(update.data);
          if (update.data.performanceMetrics) {
            setPerformanceHistory(prev => {
              const newHistory = [...prev, update.data.performanceMetrics];
              // Keep only last 100 points for real-time charts
              return newHistory.slice(-100);
            });
          }
          break;
        case 'alert':
          setAlerts(prev => [update.data, ...prev.slice(0, 49)]); // Keep last 50 alerts
          break;
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (connectionError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <XCircle className="w-6 h-6 text-red-500" />
          <div>
            <h3 className="text-lg font-medium text-red-900">Monitoring Connection Failed</h3>
            <p className="text-red-700 mt-1">{connectionError}</p>
            <p className="text-sm text-red-600 mt-2">
              Real-time monitoring requires WebSocket support. Please check your connection and refresh the page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Real-Time System Monitoring</h2>
          <p className="text-gray-600 mt-1">Live system performance and health monitoring</p>
        </div>
        <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${
          isConnected ? 'text-green-600 bg-green-50 border-green-200' : 'text-gray-600 bg-gray-50 border-gray-200'
        }`}>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="text-sm font-medium">
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>
      </div>

      {/* Performance Overview */}
      {monitoringData?.performanceMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <Activity className="w-8 h-8 text-blue-500" />
              <div>
                <h3 className="text-sm font-medium text-gray-500">CPU Usage</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {monitoringData.performanceMetrics.cpu_usage.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <Server className="w-8 h-8 text-purple-500" />
              <div>
                <h3 className="text-sm font-medium text-gray-500">Memory Usage</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {monitoringData.performanceMetrics.memory.heapUsed}MB
                </p>
                <p className="text-xs text-gray-500">
                  of {monitoringData.performanceMetrics.memory.heapTotal}MB
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <Zap className="w-8 h-8 text-yellow-500" />
              <div>
                <h3 className="text-sm font-medium text-gray-500">Response Time</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {monitoringData.performanceMetrics.response_time_avg}ms
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <div>
                <h3 className="text-sm font-medium text-gray-500">Error Rate</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {monitoringData.performanceMetrics.error_rate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Health Grid */}
      {monitoringData?.serviceHealth && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Service Health</h3>
            <p className="text-sm text-gray-500 mt-1">Real-time status of all system components</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {monitoringData.serviceHealth.map((service) => (
                <div 
                  key={service.service_name}
                  className={`p-4 rounded-lg border ${getStatusColor(service.status)}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(service.status)}
                      <h4 className="font-medium">{service.service_name}</h4>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded">
                      {service.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Response Time:</span>
                      <span className="font-medium">{service.response_time}ms</span>
                    </div>
                    {service.details.uptime !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Uptime:</span>
                        <span className="font-medium">{formatUptime(service.details.uptime)}</span>
                      </div>
                    )}
                    {service.details.performance_score !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Performance:</span>
                        <span className="font-medium">{service.details.performance_score}/100</span>
                      </div>
                    )}
                    {service.details.error_message && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                        {service.details.error_message}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Alerts</h3>
            <p className="text-sm text-gray-500 mt-1">Real-time system alerts and notifications</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert) => (
                <div 
                  key={alert.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    alert.severity === 'error' ? 'border-red-500 bg-red-50' :
                    alert.severity === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                    'border-blue-500 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`text-sm font-medium ${
                        alert.severity === 'error' ? 'text-red-800' :
                        alert.severity === 'warning' ? 'text-yellow-800' :
                        'text-blue-800'
                      }`}>
                        {alert.message}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      alert.severity === 'error' ? 'bg-red-100 text-red-800' :
                      alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {alert.severity.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No Data State */}
      {!monitoringData && isConnected && (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Collecting Monitoring Data</h3>
          <p className="text-gray-600">
            Connected to monitoring service. Performance data will appear shortly.
          </p>
        </div>
      )}
    </div>
  );
}
