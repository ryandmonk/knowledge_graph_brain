import { HashRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import MultiStepSetupWizard from './components/MultiStepSetupWizard';
import { Dashboard } from './components/Dashboard';
import { Layout } from './components/Layout';
import KnowledgeGraph3D from './components/visualization/KnowledgeGraph3D';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/setup" replace />} />
          <Route path="/setup" element={<MultiStepSetupWizard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/graph/:kb_id" element={<GraphViewer />} />
          <Route path="/graph" element={<GraphSelector />} />
        </Routes>
      </Layout>
    </Router>
  );
}

// Graph Viewer Component
function GraphViewer() {
  const { kb_id } = useParams<{ kb_id: string }>();
  
  if (!kb_id) {
    return <Navigate to="/graph" replace />;
  }

  return (
    <div className="h-screen w-screen">
      <KnowledgeGraph3D 
        kb_id={kb_id}
        className="w-full h-full"
      />
    </div>
  );
}

// Graph Selector Component  
function GraphSelector() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Select Knowledge Base</h1>
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-gray-600 mb-4">Choose a knowledge base to visualize:</p>
        <div className="space-y-2">
          <button 
            onClick={() => window.location.hash = '/graph/retail-demo'}
            className="block w-full text-left px-4 py-2 border rounded hover:bg-gray-50"
          >
            📦 retail-demo
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
