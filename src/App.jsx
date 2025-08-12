import { Routes, Route, Navigate } from 'react-router-dom'
import NavBar from './components/NavBar'
import Catalog from './pages/Catalog'
import Product from './pages/Product'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'
import About from './pages/About'
import Contacts from './pages/Contacts'
import Cart from './pages/Cart'              // ⟵ НОВЕ
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { CartProvider } from './context/CartContext' // ⟵ НОВЕ

function PrivateRoute({ children }) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null)
      setReady(true)
    })
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
        <Route path="/cart" element={<PrivateRoute><Cart /></PrivateRoute>} />   {/* ⟵ НОВЕ */}
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
        <Route path="/about" element={<About />} />
        <Route path="/contacts" element={<Contacts />} />
      </Routes>
    </CartProvider>
  )
}
