import { Routes, Route, Navigate } from 'react-router-dom'
import NavBar from './components/NavBar'
import Catalog from './pages/Catalog'
import Product from './pages/Product'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'
import About from './pages/About'
import Contacts from './pages/Contacts'
import Cart from './pages/Cart'
import AdminOrders from './pages/AdminOrders'   // ⟵ НОВЕ
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { CartProvider } from './context/CartContext'
import ResetPassword from './pages/ResetPassword'

function PrivateRoute({ children }) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user || null)
    })
    return () => sub?.subscription?.unsubscribe?.()
  }, [])

  if (!ready) return null
  return user ? children : <Navigate to="/login" />
}

export default function App() {
  return (
    <CartProvider>
      <NavBar />
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/product/:id" element={<Product />} />

        {/* Кошик і кабінет — тільки для авторизованих */}
        <Route path="/cart" element={<PrivateRoute><Cart /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

        {/* Вхід */}
        <Route path="/login" element={<Login />} />

        {/* Інфосторінки */}
        <Route path="/about" element={<About />} />
        <Route path="/contacts" element={<Contacts />} />

        {/* Адмін */}
        <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
        <Route path="/admin/orders" element={<PrivateRoute><AdminOrders /></PrivateRoute>} />

        {/* Якщо шлях не знайдено — на головну */}
        <Route path="*" element={<Navigate to="/" />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </CartProvider>
  )
}
