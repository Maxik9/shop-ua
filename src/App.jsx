import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import NavBar from './components/NavBar'
import Catalog from './pages/Catalog'
import Product from './pages/Product'
import Login from './pages/Login'
import Cart from './pages/Cart'
import Admin from './pages/Admin'
import AdminOrders from './pages/AdminOrders'
import { CartProvider } from './context/CartContext'

// тільки для авторизованих
function PrivateRoute({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: auth } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => {
      auth?.subscription?.unsubscribe?.()
    }
  }, [])

  if (loading) return null
  return user ? children : <Navigate to="/login" />
}

export default function App() {
  return (
    <CartProvider>
      <NavBar />
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/product/:id" element={<Product />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/login" element={<Login />} />

        {/* Адмін */}
        <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
        <Route path="/admin/orders" element={<PrivateRoute><AdminOrders /></PrivateRoute>} />

        {/* 404 → головна */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </CartProvider>
  )
}
