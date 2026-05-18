import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { AddressProvider } from './context/AddressContext.jsx'
import { WishlistProvider } from './context/WishlistContext.jsx'
import CartProviderGate from './components/CartProviderGate.jsx'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <AddressProvider>
            <CartProviderGate>
              <WishlistProvider>
                <ToastProvider>
                  <App />
                </ToastProvider>
              </WishlistProvider>
            </CartProviderGate>
          </AddressProvider>
        </AuthProvider>
      </BrowserRouter>
  </StrictMode>,
)
