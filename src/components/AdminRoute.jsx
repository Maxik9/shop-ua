// src/components/AdminRoute.jsx
import { Navigate } from "react-router-dom"
import { supabase } from "../supabaseClient"
import { useEffect, useState } from "react"

export default function AdminRoute({ children }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (mounted) {
        setSession(session)
        if (session?.user?.email?.endsWith("@admin.com")) {
          // 👆 приклад: адмін = всі хто має email @admin.com
          setIsAdmin(true)
        }
        setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  if (loading) return <div className="p-6 text-center">Перевірка доступу...</div>

  return (session && isAdmin) ? children : <Navigate to="/login" />
}
