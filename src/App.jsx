import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import NavBar from './components/NavBar'
import Search from './pages/Search'
import AdminImport from './pages/AdminImport'
import AdminCategoryEditor from "./pages/AdminCategoryEditor";

import ResetPassword   from './pages/ResetPassword'
// публичные страницы
import CategoriesHome from './pages/CategoriesHome'   // главная: список категорий (верхнего уровня)
import CategoryPage   from './pages/CategoryPage'     // товары категории + подкатегории
import Product        from './pages/Product'
import Cart           from './pages/Cart'
import Login          from './pages/Login'
import About          from './pages/About'
import Contacts       from './pages/Contacts'

// личный кабинет
import Dashboard      from './pages/Dashboard'

// админ
import Admin          from './pages/Admin'            // дашборд
import AdminOrders    from './pages/AdminOrders'
import AdminProducts  from './pages/AdminProducts'
import AdminProductEditor from './pages/AdminProductEditor'
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


function AdminRoute({ children }) {
  const [ready, setReady] = useState(false)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession()
      const user = data.session?.user
      if (!user) { setReady(true); setAllowed(false); return }
      const { data: ok } = await supabase.rpc('is_admin', { u: user.id })
      setAllowed(Boolean(ok))
      setReady(true)
    })()
  }, [])

  if (!ready) return null
  return allowed ? children : <Navigate to="/" />
}

export default function App() {
  return (
    <>
      <NavBar />
      <Routes>
        {/* публичные */}
        <Route path="/" element={<CategoriesHome />} />
        <Route path="/category/:key" element={<CategoryPage />} />
        <Route path="/product/:id" element={<Product />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/login" element={<Login />} />
        <Route path="/about" element={<About />} />
        <Route path="/contacts" element={<Contacts />} />

        {/* приватные */}
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

        {/* админ */}
        <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
        <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
        <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
        <Route path="/admin/products/new" element={<AdminRoute><AdminProductEditor /></AdminRoute>} />
        <Route path="/admin/products/:id" element={<AdminRoute><AdminProductEditor /></AdminRoute>} />
        <Route path="/admin/categories" element={<AdminRoute><AdminCategories /></AdminRoute>} />

        
        {/* відновлення пароля */}
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
{/* 404 → на главную */}
        <Route path="*" element={<Navigate to="/" />} />
        <Route path="/search" element={<Search />} />
	<Route path="/admin/import" element={<AdminImport/>} />
	<Route path="/admin/categories/new" element={<AdminRoute><AdminCategoryEditor /></AdminRoute>} />
	<Route path="/admin/categories/:id" element={<AdminRoute><AdminCategoryEditor /></AdminRoute>} />
      </Routes>
    </>
  )
}
