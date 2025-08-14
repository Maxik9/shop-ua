// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import NavBar from './components/NavBar'

// публічні сторінки
import CategoriesHome from './pages/CategoriesHome'      // головна (категорії)
import CategoryPage   from './pages/CategoryPage'        // товари певної категорії
import Product        from './pages/Product'
import Cart           from './pages/Cart'
import Login          from './pages/Login'
import About          from './pages/About'
import Contacts       from './pages/Contacts'

// особистий кабінет
import Dashboard      from './pages/Dashboard'

// адмін
import Admin          from './pages/Admin'               // дашборд
import AdminOrders    from './pages/AdminOrders'
import AdminProducts  from './pages/AdminProducts'
import AdminCategories from './pages/AdminCategories'

function PrivateRoute({ children }) {
  const [ready, setReady] = useState(false)
  const [user, setUser]   = useState(null)

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
    <>
      <NavBar />
      <Routes>
        {/* публічні */}
        <Route path="/" element={<CategoriesHome />} />
        <Route path="/category/:id" element={<CategoryPage />} />
        <Route path="/product/:id" element={<Product />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/login" element={<Login />} />
        <Route path="/about" element={<About />} />
        <Route path="/contacts" element={<Contacts />} />

        {/* приватні */}
        <Route path="/dashboard" element={
          <PrivateRoute><Dashboard /></PrivateRoute>
        } />

        {/* адмін */}
        <Route path="/admin" element={
          <PrivateRoute><Admin /></PrivateRoute>
        } />
        <Route path="/admin/orders" element={
          <PrivateRoute><AdminOrders /></PrivateRoute>
        } />
        <Route path="/admin/products" element={
          <PrivateRoute><AdminProducts /></PrivateRoute>
        } />
        <Route path="/admin/categories" element={
          <PrivateRoute><AdminCategories /></PrivateRoute>
        } />

        {/* 404 → на головну */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  )
}
