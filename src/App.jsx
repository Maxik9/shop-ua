// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

import NavBar from './components/NavBar'

// публічні сторінки
import CategoriesHome from './pages/CategoriesHome'      // головна + "Каталог" — список категорій
import CategoryPage from './pages/CategoryPage'          // товари конкретної категорії/підкатегорії
import Product from './pages/Product'
import Search from './pages/Search'
import About from './pages/About'
import Contacts from './pages/Contacts'
import Login from './pages/Login'

// кабінет дропшипера
import Dashboard from './pages/Dashboard'
import Cart from './pages/Cart'

// адмінка
import AdminProducts from './pages/Admin'                // сторінка керування товарами (колишній Admin.jsx)
import AdminCategories from './pages/AdminCategories'    // сторінка керування категоріями/підкатегоріями
import AdminOrders from './pages/AdminOrders'

// контекст кошика
import { CartProvider } from './context/CartContext'

/* ----------------- допоміжні маршрути ----------------- */

// тільки для авторизованих
function PrivateRoute({ children }) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      setReady(true)
    })
    return () => sub?.subscription?.unsubscribe?.()
  }, [])

  if (!ready) return null
  return user ? children : <Navigate to="/login" replace />
}

// тільки для адміна
function AdminRoute({ children }) {
  const [ready, setReady] = useState(false)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.getSession()
      const u = data.session?.user ?? null
      if (!u) { setReady(true); setAllowed(false); return }
      const { data: ok } = await supabase.rpc('is_admin', { u: u.id })
      setAllowed(Boolean(ok))
      setReady(true)
    }
    check()
  }, [])

  if (!ready) return null
  return allowed ? children : <Navigate to="/" replace />
}

/* --------------------------- App --------------------------- */

export default function App() {
  return (
    <CartProvider>
      <NavBar />

      <Routes>
        {/* Головна + каталог категорій */}
        <Route path="/" element={<CategoriesHome />} />
        <Route path="/catalog" element={<CategoriesHome />} />

        {/* Категорія / підкатегорія */}
        <Route path="/c/:id" element={<CategoryPage />} />

        {/* Пошук по всьому каталогу */}
        <Route path="/search" element={<Search />} />

        {/* Товар */}
        <Route path="/product/:id" element={<Product />} />

        {/* Кошик і кабінет — лише для авторизованих */}
        <Route path="/cart" element={<PrivateRoute><Cart /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

        {/* Авторизація */}
        <Route path="/login" element={<Login />} />

        {/* Інформаційні */}
        <Route path="/about" element={<About />} />
        <Route path="/contacts" element={<Contacts />} />

        {/* Адмінка */}
        <Route path="/admin" element={<AdminRoute><AdminProducts /></AdminRoute>} />
        <Route path="/admin/categories" element={<AdminRoute><AdminCategories /></AdminRoute>} />
        <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />

        {/* 404 → на головну */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </CartProvider>
  )
}
