import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/glassmorphism.css'
import './styles/responsive.css'
import App from './App.jsx'
import { ToastProvider } from './context/ToastContext'
import { DialogProvider } from './context/DialogContext'

console.log('Main.jsx is running');
try {
  const rootElement = document.getElementById('root');
  console.log('Root element:', rootElement);

  if (!rootElement) {
    console.error('Root element not found!');
  }

  createRoot(rootElement).render(
    <StrictMode>
      <ToastProvider>
        <DialogProvider>
          <App />
        </DialogProvider>
      </ToastProvider>
    </StrictMode>,
  )
} catch (error) {
  console.error('Error rendering app:', error);
}
