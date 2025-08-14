// src/components/NavBar.jsx
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useEffect, useState } from 'react'
import { useCart } from '../context/CartContext'

export default function NavBar() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const { count } = useCart()

  useEffect(() => {
    let unsub = () => {}
    async function init() {
      const { data } = await supabase.auth.getSession()
      const u = data.session?.user ?? null
      setUser(u)
      if (u) {
        const { data: ok } = await supabase.rpc('is_admin', { u: u.id })
        setIsAdmin(Boolean(ok))
      } else setIsAdmin(false)
    }
    init()
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => {
      const u = s?.user ?? null
      setUser(u)
      if (u) supabase.rpc('is_admin', { u: u.id }).then(({ data }) => setIsAdmin(Boolean(data)))
      else setIsAdmin(false)
    })
    unsub = () => l.subscription.unsubscribe()
    return () => unsub()
  }, [])

  async function logout(){ await supabase.auth.signOut() }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-3 h-14 flex items-center gap-4">
        <Link to="/" className="font-semibold text-indigo-600">Drop-UA</Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link to="/" className="hover:text-indigo-600">Каталог</Link>
          {user && <Link to="/dashboard" className="hover:text-indigo-600">Мої замовлення</Link>}
          {isAdmin && <Link to="/admin" className="hover:text-indigo-600">Адмін</Link>}
          <Link to="/about" className="hover:text-indigo-600">Про нас</Link>
          <Link to="/contacts" className="hover:text-indigo-600">Контакти</Link>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link to="/cart" className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-300 hover:bg-slate-50">
            🛒
            {count > 0 && (
              <span className="absolute -top-1 -right-1 rounded-full bg-indigo-600 text-white text-[11px] leading-4 w-5 h-5 text-center">
                {count}
              </span>
            )}
          </Link>
          {user ? (
            <button onClick={logout} className="h-9 px-4 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50">
              Вийти
            </button>
          ) : (
            <Link to="/login" className="h-9 px-4 text-sm inline-flex items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
              Вхід / Реєстрація
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
