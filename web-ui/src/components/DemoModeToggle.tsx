import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { api } from '../utils/api';

interface DemoModeToggleProps {
  onUpdate?: () => Promise<void> | void;
}

export default function DemoModeToggle({ onUpdate }: DemoModeToggleProps) {
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCurrentMode();
  }, []);

  const loadCurrentMode = async () => {
    try {
      const config = await api.getConfig();
      const value = config.DEMO_MODE;
      setDemoMode(String(value) === 'true');
    } catch (error) {
      console.error('Failed to load demo mode:', error);
    }
  };

  const handleToggle = async () => {
    setLoading(true);
    try {
      const newMode = !demoMode;
      
      // Update configuration
      const configResult = await api.updateConfig({ DEMO_MODE: newMode });
      
      // If config was updated successfully and requires restart, restart services
      if (configResult.requiresRestart) {
        await api.restartServices();
      }
      
      setDemoMode(newMode);
      if (onUpdate) {
        await onUpdate();
      }
    } catch (error) {
      console.error('Failed to update demo mode:', error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Settings className="w-5 h-5 text-gray-600" />
          <div>
            <h3 className="font-medium text-gray-900">Demo Mode</h3>
            <p className="text-sm text-gray-600">
              {demoMode 
                ? '🎭 Using mock data for all connectors (safe for testing)'
                : '🔐 Using real API credentials (production mode)'
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {loading && (
            <span className="text-sm text-blue-600 animate-pulse">
              🔄 Restarting services...
            </span>
          )}
          <span className="text-sm text-gray-600">
            {demoMode ? 'Demo' : 'Production'}
          </span>
          <button
            onClick={handleToggle}
            disabled={loading}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50
              ${demoMode ? 'bg-blue-600' : 'bg-gray-200'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${demoMode ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>
      </div>
      
      {demoMode && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex">
            <div className="ml-3">
              <h4 className="text-sm font-medium text-yellow-800">Demo Mode Active</h4>
              <div className="mt-1 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>All connectors use mock/sample data</li>
                  <li>No real API calls are made</li>
                  <li>Retail connector is available for testing</li>
                  <li>Safe to experiment without affecting real accounts</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {!demoMode && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex">
            <div className="ml-3">
              <h4 className="text-sm font-medium text-green-800">Production Mode Active</h4>
              <div className="mt-1 text-sm text-green-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Connectors use real API credentials</li>
                  <li>Data will be pulled from actual accounts</li>
                  <li>Ensure all credentials are properly configured</li>
                  <li>Retail connector is hidden (demo-only)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
