import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">KG</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                Knowledge Graph Brain
              </h1>
            </div>
            
            {/* Navigation Menu */}
            <nav className="flex items-center space-x-6">
              <Link 
                to="/setup"
                className={`text-sm font-medium transition-colors ${
                  location.pathname === '/setup' 
                    ? 'text-primary-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Setup
              </Link>
              <Link 
                to="/dashboard"
                className={`text-sm font-medium transition-colors ${
                  location.pathname === '/dashboard' 
                    ? 'text-primary-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Dashboard
              </Link>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">v1.0.0</span>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
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
                className="text-primary-600 hover:text-primary-700"
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
