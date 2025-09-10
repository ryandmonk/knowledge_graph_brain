import { useState, useEffect } from 'react';
import { Power, RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock, Zap, GitBranch, Settings, Shield, Database, Globe, Cpu } from 'lucide-react';

interface ServiceInfo {
  id: string;
  name: string;
  type: 'orchestrator' | 'connector' | 'database' | 'ai-service' | 'external';
  status: 'healthy' | 'warning' | 'error' | 'starting' | 'stopping' | 'unknown';
  url?: string;
  port?: number;
  dependencies: string[];
  dependents: string[];
  metrics?: {
    uptime_seconds: number;
    cpu_usage: number;
    memory_usage_mb: number;
    requests_per_minute: number;
    error_rate: number;
    last_restart?: number;
  };
  health_details?: {
    last_check: number;
    response_time_ms: number;
    error_message?: string;
  };
  restart_policy?: {
    max_retries: number;
    backoff_seconds: number;
    auto_restart: boolean;
  };
}

interface RestartSequence {
  id: string;
  services: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  current_step: number;
  total_steps: number;
  estimated_duration_seconds: number;
  errors: string[];
}

interface DependencyGraph {
  nodes: Array<{ id: string; name: string; type: string }>;
  edges: Array<{ from: string; to: string; type: 'depends_on' | 'provides_to' }>;
}

export function ServiceManager() {
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [restartSequence, setRestartSequence] = useState<RestartSequence | null>(null);
  const [dependencyGraph, setDependencyGraph] = useState<DependencyGraph | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'dependencies' | 'timeline'>('grid');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadServices();
    loadDependencyGraph();
    
    if (autoRefresh) {
      const interval = setInterval(loadServices, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadServices = async () => {
    try {
      const response = await fetch('/api/services');
      const data = await response.json();
      setServices(data.services || []);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const loadDependencyGraph = async () => {
    try {
      const response = await fetch('/api/services/dependencies');
      const data = await response.json();
      setDependencyGraph(data.graph);
    } catch (error) {
      console.error('Error loading dependency graph:', error);
    }
  };

  const restartServices = async (serviceIds: string[], intelligent: boolean = true) => {
    try {
      const response = await fetch('/api/services/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          service_ids: serviceIds,
          intelligent_sequencing: intelligent,
          rolling_restart: true
        })
      });

      const data = await response.json();
      setRestartSequence(data.restart_sequence);
      
      // Poll for restart progress
      const pollInterval = setInterval(async () => {
        try {
          const progressResponse = await fetch(`/api/services/restart/${data.restart_sequence.id}`);
          const progressData = await progressResponse.json();
          setRestartSequence(progressData.restart_sequence);
          
          if (['completed', 'failed'].includes(progressData.restart_sequence.status)) {
            clearInterval(pollInterval);
            await loadServices(); // Refresh service status
          }
        } catch (error) {
          console.error('Error polling restart progress:', error);
          clearInterval(pollInterval);
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error restarting services:', error);
    }
  };

  const stopServices = async (serviceIds: string[]) => {
    try {
      await fetch('/api/services/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_ids: serviceIds })
      });
      
      await loadServices();
    } catch (error) {
      console.error('Error stopping services:', error);
    }
  };

  const startServices = async (serviceIds: string[]) => {
    try {
      await fetch('/api/services/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_ids: serviceIds })
      });
      
      await loadServices();
    } catch (error) {
      console.error('Error starting services:', error);
    }
  };

  const toggleServiceSelection = (serviceId: string) => {
    const newSelection = new Set(selectedServices);
    if (newSelection.has(serviceId)) {
      newSelection.delete(serviceId);
    } else {
      newSelection.add(serviceId);
    }
    setSelectedServices(newSelection);
  };

  const selectAllServices = () => {
    setSelectedServices(new Set(services.map(s => s.id)));
  };

  const clearSelection = () => {
    setSelectedServices(new Set());
  };

  const getServiceIcon = (type: ServiceInfo['type']) => {
    switch (type) {
      case 'orchestrator':
        return <Settings className="w-5 h-5" />;
      case 'connector':
        return <GitBranch className="w-5 h-5" />;
      case 'database':
        return <Database className="w-5 h-5" />;
      case 'ai-service':
        return <Cpu className="w-5 h-5" />;
      case 'external':
        return <Globe className="w-5 h-5" />;
      default:
        return <Shield className="w-5 h-5" />;
    }
  };

  const getStatusIcon = (status: ServiceInfo['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'starting':
      case 'stopping':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ServiceInfo['status']) => {
    switch (status) {
      case 'healthy':
        return 'border-green-500 bg-green-50';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50';
      case 'error':
        return 'border-red-500 bg-red-50';
      case 'starting':
      case 'stopping':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatMemory = (mb: number) => {
    if (mb > 1024) return `${(mb / 1024).toFixed(1)}GB`;
    return `${mb}MB`;
  };

  const renderServiceGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {services.map((service) => (
        <div
          key={service.id}
          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
            selectedServices.has(service.id)
              ? 'border-blue-500 bg-blue-50'
              : getStatusColor(service.status)
          }`}
          onClick={() => toggleServiceSelection(service.id)}
        >
          {/* Service Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              {getServiceIcon(service.type)}
              <div>
                <div className="font-medium text-gray-900">{service.name}</div>
                <div className="text-xs text-gray-500 capitalize">{service.type}</div>
              </div>
            </div>
            {getStatusIcon(service.status)}
          </div>

          {/* Service Metrics */}
          {service.metrics && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Uptime:</span>
                <span className="font-medium">{formatUptime(service.metrics.uptime_seconds)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">CPU:</span>
                <span className={`font-medium ${
                  service.metrics.cpu_usage > 80 ? 'text-red-600' :
                  service.metrics.cpu_usage > 60 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {service.metrics.cpu_usage.toFixed(1)}%
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Memory:</span>
                <span className="font-medium">{formatMemory(service.metrics.memory_usage_mb)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Requests/min:</span>
                <span className="font-medium">{service.metrics.requests_per_minute}</span>
              </div>

              {service.metrics.error_rate > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Error Rate:</span>
                  <span className="font-medium text-red-600">{service.metrics.error_rate.toFixed(2)}%</span>
                </div>
              )}
            </div>
          )}

          {/* Health Details */}
          {service.health_details?.error_message && (
            <div className="mt-3 p-2 bg-red-100 text-red-800 text-sm rounded-md">
              {service.health_details.error_message}
            </div>
          )}

          {/* Dependencies */}
          {showAdvanced && (service.dependencies.length > 0 || service.dependents.length > 0) && (
            <div className="mt-3 pt-3 border-t border-gray-200 space-y-2 text-xs">
              {service.dependencies.length > 0 && (
                <div>
                  <span className="text-gray-600">Depends on:</span>
                  <div className="text-gray-800">{service.dependencies.join(', ')}</div>
                </div>
              )}
              {service.dependents.length > 0 && (
                <div>
                  <span className="text-gray-600">Required by:</span>
                  <div className="text-gray-800">{service.dependents.join(', ')}</div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderDependencyGraph = () => (
    <div className="bg-white rounded-lg p-6 min-h-96">
      <div className="text-center text-gray-500">
        <GitBranch className="w-12 h-12 mx-auto mb-2 text-gray-400" />
        <p>Interactive Dependency Graph</p>
        <p className="text-sm mt-1">Visual representation of service dependencies</p>
        {dependencyGraph && (
          <div className="mt-4 text-sm">
            <p>{dependencyGraph.nodes.length} services, {dependencyGraph.edges.length} dependencies</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Management Center</h1>
          <p className="text-gray-600">Monitor, manage, and restart services with intelligent dependency handling</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 text-sm rounded-md transition-colors ${
              autoRefresh 
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-gray-100 text-gray-700 border border-gray-300'
            }`}
          >
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={loadServices}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              {selectedServices.size} of {services.length} services selected
            </div>
            <button
              onClick={selectAllServices}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Select All
            </button>
            <button
              onClick={clearSelection}
              className="text-sm text-gray-600 hover:text-gray-700"
            >
              Clear Selection
            </button>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`px-3 py-1 text-sm rounded-md ${
                showAdvanced 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              Advanced
            </button>
            
            <div className="flex items-center border rounded-md">
              {['grid', 'dependencies', 'timeline'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`px-3 py-1 text-sm capitalize ${
                    viewMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {selectedServices.size > 0 && (
          <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => startServices(Array.from(selectedServices))}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Power className="w-4 h-4" />
              <span>Start</span>
            </button>
            
            <button
              onClick={() => stopServices(Array.from(selectedServices))}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              <Power className="w-4 h-4" />
              <span>Stop</span>
            </button>
            
            <button
              onClick={() => restartServices(Array.from(selectedServices), true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Zap className="w-4 h-4" />
              <span>Intelligent Restart</span>
            </button>
            
            <button
              onClick={() => restartServices(Array.from(selectedServices), false)}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Force Restart</span>
            </button>
          </div>
        )}
      </div>

      {/* Restart Progress */}
      {restartSequence && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Restart Progress</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {restartSequence.status === 'running' && <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />}
                {restartSequence.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                {restartSequence.status === 'failed' && <XCircle className="w-5 h-5 text-red-500" />}
                <span className="font-medium capitalize">{restartSequence.status}</span>
              </div>
              <span className="text-sm text-gray-600">
                Step {restartSequence.current_step} of {restartSequence.total_steps}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${(restartSequence.current_step / restartSequence.total_steps) * 100}%` }}
              />
            </div>
            
            <div className="text-sm text-gray-600">
              Services: {restartSequence.services.join(', ')}
            </div>
            
            {restartSequence.errors.length > 0 && (
              <div className="p-3 bg-red-100 text-red-800 text-sm rounded-md">
                <div className="font-medium mb-1">Errors:</div>
                <ul className="list-disc list-inside space-y-1">
                  {restartSequence.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Service Views */}
      <div className="bg-white rounded-lg shadow p-6">
        {viewMode === 'grid' && renderServiceGrid()}
        {viewMode === 'dependencies' && renderDependencyGraph()}
        {viewMode === 'timeline' && (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>Service Timeline View</p>
            <p className="text-sm mt-1">Historical service events and restart timeline</p>
          </div>
        )}
      </div>
    </div>
  );
}
