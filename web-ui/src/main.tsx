import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Import the multi-step wizard instead
import MultiStepSetupWizard from './components/MultiStepSetupWizard.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MultiStepSetupWizard />
  </StrictMode>,
)
