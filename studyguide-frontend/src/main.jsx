import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { DocumentProvider } from './context/DocumentContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <DocumentProvider>
        <App />
      </DocumentProvider>
    </BrowserRouter>
  </StrictMode>,
)
