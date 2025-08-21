// src/components/PrivateRoute.jsx
import { Navigate } from "react-router-dom"
import { supabase } from "../supabaseClient"
import { useEffect, useState } from "react"

export default function PrivateRoute({ children }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (mounted) {
        setSession(session)
        setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  if (loading) return <div className="p-6 text-center">Завантаження...</div>

  return session ? children : <Navigate to="/login" />
}
