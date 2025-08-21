// src/components/Footer.jsx
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../supabaseClient"

export default function Footer() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      // 1) хто залогінений?
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        if (mounted) setIsAdmin(false)
        return
      }

      // 2) витягнути свою роль з profiles (RLS дозволяє читати тільки свій профіль)
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle()

      if (mounted) setIsAdmin(!error && data?.role === "admin")
    }

    load()

    // оновлювати при логіні/логауті
    const { data: sub } = supabase.auth.onAuthStateChange(() => load())

    return () => {
      mounted = false
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

  return (
    <footer className="bg-slate-100 mt-10">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 text-center sm:text-left">
        <div className="grid gap-6 sm:grid-cols-3">
          {/* Бренд */}
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span role="img" aria-label="globe">🌐</span> Dropship Hub
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Платформа для дропшиперів та постачальників.
            </p>
          </div>

          {/* Навігація */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Навігація</h3>
            <ul className="space-y-1 text-sm">
              <li><Link className="hover:text-indigo-600" to="/">Каталог</Link></li>
              <li><Link className="hover:text-indigo-600" to="/dashboard">Мої замовлення</Link></li>
              {/* Показуємо тільки якщо роль = admin */}
              {isAdmin && (
                <li><Link className="hover:text-indigo-600" to="/admin">Адмін панель</Link></li>
              )}
              <li><Link className="hover:text-indigo-600" to="/contacts">Контакти</Link></li>
            </ul>
          </div>

          {/* Контакти */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Контакти</h3>
            <p className="text-sm text-slate-600">Email: support@example.com</p>
            <p className="text-sm text-slate-600">Тел: +380 99 123 45 67</p>
            <p className="text-sm text-slate-600">Графік: Пн–Пт 9:00–18:00</p>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-500 text-center">
          © {new Date().getFullYear()} Dropship Hub. Усі права захищено.
        </div>
      </div>
    </footer>
  )
}
