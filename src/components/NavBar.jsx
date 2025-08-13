// src/components/NavBar.jsx
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useEffect, useMemo, useState } from 'react'
import { useCart } from '../context/CartContext'

export default function NavBar() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [open, setOpen] = useState(false) // mobile menu

  // Беремо items з контексту і самі рахуємо суму кількостей
  const { items = [] } = useCart() || {}
  const totalQty = useMemo(() => {
    if (!Array.isArray(items)) return 0
    return items.reduce((sum, it) => sum + Number(it?.qty || 0), 0)
  }, [items])

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
      if (u) {
        supabase.rpc('is_admin', { u: u.id }).then(({ data }) => setIsAdmin(Boolean(data)))
      } else setIsAdmin(false)
    })
    return () => sub?.subscription?.unsubscribe()
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    setOpen(false)
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-3 h-14 flex items-center gap-3">
        {/* Бургер (мобілка) */}
        <button
          className="md:hidden h-9 w-9 grid place-items-center rounded-lg border border-slate-200"
          onClick={() => setOpen(v => !v)}
          aria-label="Відкрити меню"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Лого */}
        <Link to="/" className="font-semibold text-indigo-600 text-lg" onClick={() => setOpen(false)}>
          Drop-UA
        </Link>

        {/* Меню (ПК) */}
        <nav className="hidden md:flex items-center gap-4 text-sm">
          <Link to="/" className="hover:text-indigo-600">Каталог</Link>
          {user && <Link to="/dashboard" className="hover:text-indigo-600">Мої замовлення</Link>}
          {isAdmin && <Link to="/admin" className="hover:text-indigo-600">Адмін</Link>}
          {isAdmin && <Link to="/admin/orders" className="hover:text-indigo-600">Замовлення (адмін)</Link>}
          <Link to="/about" className="hover:text-indigo-600">Про нас</Link>
          <Link to="/contacts" className="hover:text-indigo-600">Контакти</Link>
        </nav>

        {/* Праворуч: кошик + логін/вихід */}
        <div className="ml-auto flex items-center gap-2">
          {/* Іконка кошика з бейджем кількості */}
          <Link
            to="/cart"
            className="relative h-9 w-9 grid place-items-center rounded-lg border border-slate-200 hover:bg-slate-50"
            aria-label="Кошик"
            onClick={() => setOpen(false)}
          >
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l3-8H6.4M7 13l-2 7h14M7 13l-1.6-8M10 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
            </svg>
            {totalQty > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full
                           bg-indigo-600 text-white text-[11px] leading-[18px] text-center"
                title={`Товарів у кошику: ${totalQty}`}
              >
                {totalQty}
              </span>
            )}
          </Link>

          {user ? (
            <button
              onClick={logout}
              className="hidden md:inline-flex h-9 px-4 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50"
            >
              Вийти
            </button>
          ) : (
            <Link
              to="/login"
              className="hidden md:inline-flex h-9 px-4 text-sm items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Вхід / Реєстрація
            </Link>
          )}
        </div>
      </div>

      {/* Мобільне меню */}
      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <nav className="max-w-6xl mx-auto px-3 py-3 flex flex-col gap-2 text-[15px]">
            <Link to="/" onClick={() => setOpen(false)} className="py-1">Каталог</Link>
            {user && <Link to="/dashboard" onClick={() => setOpen(false)} className="py-1">Мої замовлення</Link>}
            {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} className="py-1">Адмін</Link>}
            {isAdmin && <Link to="/admin/orders" onClick={() => setOpen(false)} className="py-1">Замовлення (адмін)</Link>}
            <Link to="/about" onClick={() => setOpen(false)} className="py-1">Про нас</Link>
            <Link to="/contacts" onClick={() => setOpen(false)} className="py-1">Контакти</Link>

            <div className="pt-2 flex gap-2">
              {user ? (
                <button
                  onClick={logout}
                  className="h-9 px-4 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50 w-full"
                >
                  Вийти
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="h-9 px-4 text-sm inline-flex items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 w-full"
                >
                  Вхід / Реєстрація
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
