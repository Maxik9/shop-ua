// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import NavBar from './components/NavBar'
import Catalog from './pages/Catalog'            // залишимо, але вже не головний вхід
import Product from './pages/Product'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'
import AdminOrders from './pages/AdminOrders'
import About from './pages/About'
import Contacts from './pages/Contacts'
import Cart from './pages/Cart'
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { CartProvider } from './context/CartContext'

// НОВЕ:
import CategoriesHome from './pages/CategoriesHome'
import CategoryPage from './pages/CategoryPage'
import AdminCategories from './pages/AdminCategories'
import Search from './pages/Search'

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
        {/* НОВЕ: домашня тепер — категорії */}
        <Route path="/" element={<CategoriesHome />} />
        <Route path="/categories" element={<CategoriesHome />} />
        <Route path="/c/:slug" element={<CategoryPage />} />
        <Route path="/search" element={<Search />} />

        {/* залишаємо існуючі сторінки */}
        <Route path="/product/:id" element={<Product />} />
        <Route path="/cart" element={<PrivateRoute><Cart /></PrivateRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
        <Route path="/admin/orders" element={<PrivateRoute><AdminOrders /></PrivateRoute>} />
        {/* НОВЕ: адмін категорій */}
        <Route path="/admin/categories" element={<PrivateRoute><AdminCategories /></PrivateRoute>} />
        <Route path="/about" element={<About />} />
        <Route path="/contacts" element={<Contacts />} />

        <Route path="/catalog" element={<Navigate to="/categories" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </CartProvider>
  )
}
