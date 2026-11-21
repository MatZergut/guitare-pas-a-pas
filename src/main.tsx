import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { AppRoutes } from './app/AppRoutes'
import { setupPwa } from './app/pwa'
import { useSettings } from './stores/settings'
import './index.css'

setupPwa()
void useSettings.getState().hydrate()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </StrictMode>,
)
