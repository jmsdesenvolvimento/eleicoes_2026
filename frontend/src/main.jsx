import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Admin from './Admin.jsx'

const caminho = window.location.pathname

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {caminho === '/admin' ? <Admin /> : <App />}
  </StrictMode>,
)