// src/components/NavBar.jsx
import { Link, NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useCart } from '../context/CartContext'

export default function NavBar() {
  const { count } = useCart()
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [open, setOpen] = useState(false)

  // ---- auth + is_admin
  useEffect(() => {
    let unsub = () => {}

    async function prime() {
      const { data } = await supabase.auth.getSession()
      const u = data.session?.user ?? null
      setUser(u)
      if (u) {
        const { data: ok } = await supabase.rpc('is_admin', { u: u.id })
        setIsAdmin(Boolean(ok))
      } else {
        setIsAdmin(false)
      }
    }
    prime()

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        supabase.rpc('is_admin', { u: u.id }).then(({ data }) => setIsAdmin(Boolean(data)))
      } else {
        setIsAdmin(false)
      }
    })
    unsub = () => sub.subscription.unsubscribe()
    return () => unsub()
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    setOpen(false)
  }

  const linkCls =
    'px-2 py-2 rounded-md text-sm hover:text-indigo-600 hover:bg-slate-50 md:hover:bg-transparent'

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-3 h-14 flex items-center gap-3">
        {/* Brand */}
        <Link
          to="/"
          className="font-semibold text-indigo-600 text-lg select-none"
          onClick={() => setOpen(false)}
        >
          Drop-UA
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-2">
          <NavLink to="/" className={linkCls}>Каталог</NavLink>
          {user && <NavLink to="/dashboard" className={linkCls}>Мої замовлення</NavLink>}
          {isAdmin && <NavLink to="/admin" className={linkCls}>Адмін</NavLink>}
          {isAdmin && <NavLink to="/admin/orders" className={linkCls}>Замовлення (адмін)</NavLink>}
          <NavLink to="/about" className={linkCls}>Про нас</NavLink>
          <NavLink to="/contacts" className={linkCls}>Контакти</NavLink>
        </nav>

        {/* Right side: cart + auth */}
        <div className="ml-auto flex items-center gap-2">
          {/* Cart button (з бейджем) */}
          <Link
            to="/cart"
            className="relative inline-flex items-center justify-center h-9 w-9 rounded-lg border border-slate-300 hover:bg-slate-50"
            title="Кошик"
            onClick={() => setOpen(false)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M6 6h15l-1.5 9H7.6L6 6Z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6 6H3" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="9.5" cy="20" r="1.6" fill="currentColor" />
              <circle cx="17.5" cy="20" r="1.6" fill="currentColor" />
            </svg>
            {count > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 min-w-[18px] h-[18px] text-[11px] leading-[18px] text-white bg-indigo-600 rounded-full text-center">
                {count}
              </span>
            )}
          </Link>

          {user ? (
            <button
              onClick={logout}
              className="h-9 px-4 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50"
            >
              Вийти
            </button>
          ) : (
            <Link
              to="/login"
              className="h-9 px-4 text-sm inline-flex items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              onClick={() => setOpen(false)}
            >
              Вхід / Реєстрація
            </Link>
          )}

          {/* Burger (mobile) */}
          <button
            className="md:hidden h-9 w-9 rounded-lg border border-slate-300 hover:bg-slate-50"
            onClick={() => setOpen((v) => !v)}
            aria-label="Меню"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <nav className="max-w-6xl mx-auto px-3 py-2 flex flex-col">
            <NavLink to="/" className={linkCls} onClick={() => setOpen(false)}>Каталог</NavLink>
            {user && (
              <NavLink to="/dashboard" className={linkCls} onClick={() => setOpen(false)}>
                Мої замовлення
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/admin" className={linkCls} onClick={() => setOpen(false)}>
                Адмін
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/admin/orders" className={linkCls} onClick={() => setOpen(false)}>
                Замовлення (адмін)
              </NavLink>
            )}
            <NavLink to="/about" className={linkCls} onClick={() => setOpen(false)}>
              Про нас
            </NavLink>
            <NavLink to="/contacts" className={linkCls} onClick={() => setOpen(false)}>
              Контакти
            </NavLink>
          </nav>
        </div>
      )}
    </header>
  )
}
