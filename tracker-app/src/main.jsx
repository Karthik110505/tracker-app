import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import MobileApp from './components/mobile/MobileApp.jsx'

// Check if running inside native Android (Capacitor) or in explicit mobile preview query (?platform=mobile or ?mobile=1)
const isCapacitor = typeof window !== 'undefined' && (
  window.Capacitor !== undefined ||
  window.location.protocol === 'capacitor:' ||
  window.location.protocol === 'ionic:' ||
  window.location.protocol === 'content:'
);

const isMobilePreview = typeof window !== 'undefined' && (
  window.location.search.includes('platform=mobile') ||
  window.location.search.includes('mobile=1')
);

const isMobileDevice = typeof window !== 'undefined' && (
  isCapacitor ||
  isMobilePreview
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isMobileDevice ? <MobileApp isPreview={isMobilePreview} /> : <App />}
  </StrictMode>,
)
