import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import NavBar from './components/NavBar'

// публічні сторінки
import CategoriesHome from './pages/CategoriesHome'
import CategoryPage   from './pages/CategoryPage'
import Product        from './pages/Product'
import Cart           from './pages/Cart'
import Login          from './pages/Login'
import About          from './pages/About'
import Contacts       from './pages/Contacts'
import Search         from './pages/Search'
import ResetPassword  from './pages/ResetPassword'
import NotFound       from './pages/NotFound'

// приватні
import Dashboard      from './pages/Dashboard'

// адмін
import Admin              from './pages/Admin'
import AdminOrders        from './pages/AdminOrders'
import AdminProducts      from './pages/AdminProducts'
import AdminProductEditor from './pages/AdminProductEditor'
import AdminCategories    from './pages/AdminCategories'
import AdminCategoryEditor from './pages/AdminCategoryEditor'
import AdminImport        from './pages/AdminImport'

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
  return user ? children : <Navigate to="/login" replace />
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
  return allowed ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <>
      <NavBar />
      <Routes>
        {/* публічні */}
        <Route path="/" element={<CategoriesHome />} />
        <Route path="/category/:key" element={<CategoryPage />} />
        <Route path="/product/:id" element={<Product />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/login" element={<Login />} />
        <Route path="/about" element={<About />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/search" element={<Search />} />

        {/* відновлення пароля */}
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />

        {/* приватні */}
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

        {/* адмін */}
        <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
        <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
        <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
        <Route path="/admin/products/new" element={<AdminRoute><AdminProductEditor /></AdminRoute>} />
        <Route path="/admin/products/:id" element={<AdminRoute><AdminProductEditor /></AdminRoute>} />
        <Route path="/admin/categories" element={<AdminRoute><AdminCategories /></AdminRoute>} />
        <Route path="/admin/categories/new" element={<AdminRoute><AdminCategoryEditor /></AdminRoute>} />
        <Route path="/admin/categories/:id" element={<AdminRoute><AdminCategoryEditor /></AdminRoute>} />
        <Route path="/admin/import" element={<AdminRoute><AdminImport /></AdminRoute>} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
