import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MultiStepSetupWizard from './components/MultiStepSetupWizard';
import { Dashboard } from './components/Dashboard';
import { Layout } from './components/Layout';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/setup" replace />} />
          <Route path="/setup" element={<MultiStepSetupWizard />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
