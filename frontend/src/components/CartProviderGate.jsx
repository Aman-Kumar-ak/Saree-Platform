import { useAuth } from '../context/AuthContext.jsx'
import { CartProvider } from '../context/CartContext.jsx'

export default function CartProviderGate({ children }) {
  const { user, ready } = useAuth()
  const key = ready ? user?.id ?? 'guest' : 'loading'

  return <CartProvider key={key}>{children}</CartProvider>
}
