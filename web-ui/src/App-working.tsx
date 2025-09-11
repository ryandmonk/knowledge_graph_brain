import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';

// Simplified API client for testing
const api = {
  async checkService(url: string) {
    try {
      const response = await fetch(url, { 
        method: 'GET',
        mode: 'cors',
        credentials: 'same-origin'
      });
      
      return {
        name: url.includes('7474') ? 'Neo4j' : 
              url.includes('11434') ? 'Ollama' : 
              url.includes('3000') ? 'Orchestrator' : 'Service',
        url,
        status: response.ok ? 'healthy' as const : 'unhealthy' as const,
        message: response.ok ? 'Service is running' : 'Service unavailable',
        port: parseInt(url.match(/:(\d+)/)?.[1] || '0')
      };
    } catch (error) {
      return {
        name: url.includes('7474') ? 'Neo4j' : 
              url.includes('11434') ? 'Ollama' : 
              url.includes('3000') ? 'Orchestrator' : 'Service',
        url,
        status: 'unhealthy' as const,
        message: error instanceof Error ? error.message : 'Service unavailable',
        port: parseInt(url.match(/:(\d+)/)?.[1] || '0')
      };
    }
  }
};

function ServiceCard({ service, onRecheck }: { 
  service: any; 
  onRecheck: () => void;
}) {
  const statusIcon = service.status === 'healthy' ? (
    <CheckCircle className="w-5 h-5 text-green-600" />
  ) : service.status === 'checking' ? (
    <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
  ) : (
    <XCircle className="w-5 h-5 text-red-600" />
  );

  const statusColor = service.status === 'healthy' ? 
    'bg-green-100 text-green-800 border-green-200' : 
    service.status === 'checking' ? 
    'bg-blue-100 text-blue-800 border-blue-200' : 
    'bg-red-100 text-red-800 border-red-200';

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        {statusIcon}
        <div>
          <h4 className="font-medium text-gray-900">{service.name}</h4>
          <p className="text-sm text-gray-500">Port {service.port}</p>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusColor}`}>
          {service.status === 'checking' ? 'Checking...' : service.status}
        </span>
        {service.status !== 'checking' && (
          <button
            onClick={onRecheck}
            className="text-sm text-blue-600 hover:text-blue-700 px-3 py-1 rounded bg-blue-50 hover:bg-blue-100"
          >
            Recheck
          </button>
        )}
      </div>
    </div>
  );
}

function App() {
  const [services, setServices] = useState<any[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const serviceUrls = [
    'http://localhost:7474',
    'http://localhost:11434/api/tags', 
    'http://localhost:3000/api/health'
  ];

  const checkAllServices = async () => {
    setIsChecking(true);
    setError(null);
    
    try {
      const results = await Promise.all(
        serviceUrls.map(url => api.checkService(url))
      );
      setServices(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check services');
    } finally {
      setIsChecking(false);
    }
  };

  const recheckService = async (index: number) => {
    const newServices = [...services];
    newServices[index] = { ...newServices[index], status: 'checking' };
    setServices(newServices);
    
    try {
      const result = await api.checkService(serviceUrls[index]);
      newServices[index] = result;
      setServices(newServices);
    } catch (error) {
      // Error handling already in checkService
    }
  };

  useEffect(() => {
    checkAllServices();
  }, []);

  const healthyServices = services.filter(s => s.status === 'healthy').length;
  const allHealthy = healthyServices === services.length && services.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">KG</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                Knowledge Graph Brain
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">v0.19.0</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Knowledge Graph Brain Setup
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Welcome! Let's get your knowledge graph system up and running. 
            This wizard will guide you through checking services and configuration.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center items-center mb-8">
          <div className="flex items-center space-x-8">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
                1
              </div>
              <span className="ml-2 text-sm font-medium text-gray-900">Service Check</span>
            </div>
            <div className="w-24 h-0.5 bg-gray-300"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-sm font-medium">
                2
              </div>
              <span className="ml-2 text-sm text-gray-500">Configuration</span>
            </div>
            <div className="w-24 h-0.5 bg-gray-300"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-sm font-medium">
                3
              </div>
              <span className="ml-2 text-sm text-gray-500">Complete</span>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800">Setup Error</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Main Setup Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="flex-grow">
              <h3 className="text-lg font-medium text-gray-900">
                Check Core Services
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Verify that Neo4j and Ollama are running
              </p>
              
              <div className="mt-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-gray-900">Service Status</h4>
                  <button
                    onClick={checkAllServices}
                    disabled={isChecking}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                    <span>{isChecking ? 'Checking...' : 'Refresh All'}</span>
                  </button>
                </div>
                
                {services.length > 0 && (
                  <div className="space-y-3">
                    {services.map((service, index) => (
                      <ServiceCard 
                        key={index}
                        service={service}
                        onRecheck={() => recheckService(index)}
                      />
                    ))}
                  </div>
                )}

                {allHealthy && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-800 font-medium">All services are running!</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Your knowledge graph system is ready. You can proceed to configuration.
                    </p>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors mt-3">
                      Continue to Configuration
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status Summary */}
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Setup Progress</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>✅ React UI: Working perfectly</p>
            <p>📡 API Connectivity: {services.length > 0 ? 'Connected' : 'Testing...'}</p>
            <p>🎯 Services Healthy: {healthyServices}/{services.length}</p>
            <p>🚀 Ready for Configuration: {allHealthy ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>© 2025 Knowledge Graph Brain. Open source project.</p>
            <p className="mt-1">
              Need help? Check the{' '}
              <a 
                href="https://github.com/ryandmonk/knowledge_graph_brain/blob/main/README.md" 
                className="text-blue-600 hover:text-blue-700"
                target="_blank"
                rel="noopener noreferrer"
              >
                documentation
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
