import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useEffect, useState } from 'react'
import { useCart } from '../context/CartContext'

export default function NavBar() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(null)
  const { count } = useCart()

  useEffect(() => {
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
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      const u = s?.user ?? null
      setUser(u)
      if (u) supabase.rpc('is_admin', { u: u.id }).then(({ data }) => setIsAdmin(Boolean(data)))
      else setIsAdmin(false)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function logout(){ await supabase.auth.signOut() }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-3 h-14 flex items-center gap-4">
        <Link to="/" className="font-semibold text-indigo-600">Drop-UA</Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link to="/" className="hover:text-indigo-600">Каталог</Link>
          {user && <Link to="/dashboard" className="hover:text-indigo-600">Мої замовлення</Link>}
          {user && (
            <Link to="/cart" className="hover:text-indigo-600">
              Кошик {count ? <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700">{count}</span> : null}
            </Link>
          )}
          {isAdmin === true && <Link to="/admin" className="hover:text-indigo-600">Адмін</Link>}
          {isAdmin === true && <Link to="/admin/orders" className="hover:text-indigo-600">Замовлення (адмін)</Link>}
          <Link to="/about" className="hover:text-indigo-600">Про нас</Link>
          <Link to="/contacts" className="hover:text-indigo-600">Контакти</Link>
        </nav>

        <div className="ml-auto">
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
