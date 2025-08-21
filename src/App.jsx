// src/App.jsx
import { Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Шапка/навігація та футер
import NavBar from './components/NavBar'
import Footer from './components/Footer'

// Публічні сторінки
import CategoriesHome from './pages/CategoriesHome'
import CategoryPage from './pages/CategoryPage'
import Product from './pages/Product'
import Cart from './pages/Cart'
import Login from './pages/Login'
import About from './pages/About'
import Contacts from './pages/Contacts'
import Search from './pages/Search'
import ResetPassword from './pages/ResetPassword'
import NotFound from './pages/NotFound'

// Кабінет користувача
import Dashboard from './pages/Dashboard'

// Адмінка
import Admin from './pages/Admin'
import AdminOrders from './pages/AdminOrders'
import AdminProducts from './pages/AdminProducts'
import AdminProductEditor from './pages/AdminProductEditor'
import AdminCategories from './pages/AdminCategories'
import AdminCategoryEditor from './pages/AdminCategoryEditor'
import AdminImport from './pages/AdminImport'

// Роути-декоратори
import PrivateRoute from './components/PrivateRoute'
import AdminRoute from './components/AdminRoute'

export default function App() {
  // (необовʼязково) тримаємо сесію, щоб при оновленні не блимало
  const [session, setSession] = useState(null)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (mounted) setSession(session || null)
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) setSession(session || null)
      })
      return () => {
        authListener?.subscription?.unsubscribe?.()
      }
    })()
    return () => { mounted = false }
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      <main className="flex-1">
        <Routes>
          {/* Публічні */}
          <Route path="/" element={<CategoriesHome />} />
          <Route path="/category/:key" element={<CategoryPage />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/about" element={<About />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/search" element={<Search />} />

          {/* Відновлення пароля (обидва шляхи на всяк випадок) */}
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />

          {/* Кабінет (приватний) */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          {/* Адмінка */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <AdminRoute>
                <AdminOrders />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/products"
            element={
              <AdminRoute>
                <AdminProducts />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/products/new"
            element={
              <AdminRoute>
                <AdminProductEditor />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/products/:id"
            element={
              <AdminRoute>
                <AdminProductEditor />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <AdminRoute>
                <AdminCategories />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/categories/new"
            element={
              <AdminRoute>
                <AdminCategoryEditor />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/categories/:id"
            element={
              <AdminRoute>
                <AdminCategoryEditor />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/import"
            element={
              <AdminRoute>
                <AdminImport />
              </AdminRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
