import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { motion, AnimatePresence } from 'framer-motion'

// Global references for animation components (Fix for production TDZ issues)
// Cache bust: 2024-12-27-04:10
window.motion = motion;
window.AnimatePresence = AnimatePresence;

// Main entry point

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
