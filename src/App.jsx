// App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import NavBar from './components/NavBar'
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
  if (!ready) return null
  return user ? children : <Navigate to="/login" />
}

export default function App() {
  return (
    <div>
      <NavBar />
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/new-order" element={<PrivateRoute><NewOrder /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
        <Route path="/about" element={<About />} />
        <Route path="/contacts" element={<Contacts />} />
      </Routes>
    </div>
  )
}
