import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@shiodome47/sekisho/style.css'
import '@shiodome47/sekisho-town/style.css'
import './demo.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
