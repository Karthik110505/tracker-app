import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Capacitor } from '@capacitor/core'
import App from './App.jsx'
import MobileApp from './components/mobile/MobileApp.jsx'

// Check if running inside native Android Capacitor app
const isNativeAndroid = typeof window !== 'undefined' && (
  Capacitor.isNativePlatform() ||
  window.location.protocol === 'capacitor:' ||
  window.location.protocol === 'content:'
);

const isExplicitPreview = typeof window !== 'undefined' && (
  window.location.search.includes('platform=mobile') ||
  window.location.search.includes('mobile=1')
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isNativeAndroid || isExplicitPreview ? <MobileApp isPreview={isExplicitPreview} /> : <App />}
  </StrictMode>,
)
