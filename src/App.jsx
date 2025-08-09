import { Routes, Route, Navigate, Link } from 'react-router-dom'
import Catalog from './pages/Catalog'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NewOrder from './pages/NewOrder'
import Admin from './pages/Admin'
import About from './pages/About'
import Contacts from './pages/Contacts'
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function PrivateRoute({ children }) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null)
      setReady(true)
    })
  }, [])
  if (!ready) return <p style={{ padding: 24 }}>Завантаження…</p>
  return user ? children : <Navigate to="/login" />
}

function InlineNav() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(null) // null = не знаем; true/false

  useEffect(() => {
    let unsub = () => {}

    async function init() {
      const { data } = await supabase.auth.getSession()
      const u = data.session?.user ?? null
      setUser(u)
      if (u) checkAdmin(u.id); else setIsAdmin(false)
    }

    async function checkAdmin(uid) {
      // спрашиваем БД (функция public.is_admin)
      const { data, error } = await supabase.rpc('is_admin', { u: uid })
      if (error) {
        console.warn('rpc is_admin error:', error)
        setIsAdmin(false)
        return
      }
      setIsAdmin(Boolean(data))
    }

    init()
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) checkAdmin(u.id); else setIsAdmin(false)
    })
    unsub = () => sub.subscription.unsubscribe()

    return () => unsub()
  }, [])

  async function logout() { await supabase.auth.signOut() }

  return (
    <nav style={{display:'flex', gap:12, padding:12, borderBottom:'1px solid #eee', alignItems:'center'}}>
      {/* ЯРКАЯ МЕТКА, чтобы убедиться, что рендерится именно этот навбар */}
      <span style={{background:'#ff0', border:'1px solid #000', padding:'2px 6px'}}>NAV_INLINE</span>

      <Link to="/">Каталог</Link>
      {user && <Link to="/dashboard">Мої замовлення</Link>}
      {user && <Link to="/new-order">Оформити замовлення</Link>}
      {/* “Адмін” виден только если БД вернула true */}
      {isAdmin === true && <Link to="/admin">Адмін</Link>}
      <Link to="/about">Про нас</Link>
      <Link to="/contacts">Контакти</Link>

      <div style={{marginLeft:'auto', display:'flex', gap:12, alignItems:'center'}}>
        <small style={{opacity:0.6}}>[admin:{String(isAdmin)}]</small>
        {user ? <button onClick={logout}>Вийти</button> : <Link to="/login">Вхід / Реєстрація</Link>}
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <div>
      <InlineNav />
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/new-order" element={<PrivateRoute><NewOrder /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
        <Route path="/about" element={<About />} />
        <Route path="/contacts" element={<Contacts />} />
      </Routes>
      <footer style={{padding:24, textAlign:'center', color:'#888'}}>© {new Date().getFullYear()} Drop-UA</footer>
    </div>
  )
}
