import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { AddressProvider } from './context/AddressContext.jsx'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AddressProvider>
          <CartProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </CartProvider>
        </AddressProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
