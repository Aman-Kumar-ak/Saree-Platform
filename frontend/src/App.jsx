import { Navigate, Route, Routes } from 'react-router-dom'
import AdminCategories from './admin/AdminCategories.jsx'
import AdminOrders from './admin/AdminOrders.jsx'
import AdminProducts from './admin/AdminProducts.jsx'
import AdminShell from './admin/AdminShell.jsx'
import { AppLayout } from './layout/AppLayout.jsx'
import Cart from './pages/Cart.jsx'
import Checkout from './pages/Checkout.jsx'
import Login from './pages/Login.jsx'
import OrderConfirmation from './pages/OrderConfirmation.jsx'
import Shop from './pages/Shop.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import Addresses from './pages/Addresses.jsx'
import Orders from './pages/Orders.jsx'
import Wishlist from './pages/Wishlist.jsx'
import Profile from './pages/Profile.jsx'
import { ToastContainer } from './components/ToastContainer.jsx'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AppLayout />}>
          <Route index element={<Shop />} />
          <Route path="product/:slug" element={<ProductDetail />} />
          <Route path="cart" element={<Cart />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="profile" element={<Profile />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="order/:orderNumber" element={<OrderConfirmation />} />
          <Route path="address" element={<Addresses />} />
          <Route path="orders" element={<Orders />} />
        </Route>
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<Navigate to="orders" replace />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="categories" element={<AdminCategories />} />
        </Route>
      </Routes>
      <ToastContainer />
    </>
  )
}
