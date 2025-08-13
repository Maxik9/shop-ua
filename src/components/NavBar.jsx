// src/components/NavBar.jsx
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useEffect, useMemo, useState } from 'react'
import { useCart } from '../context/CartContext'

export default function NavBar() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [open, setOpen] = useState(false) // ⬅️ мобільне меню

  const { items = [] } = useCart() || {}
  const cartQty = useMemo(
    () => (Array.isArray(items) ? items.reduce((s, it) => s + Number(it?.qty || 0), 0) : 0),
    [items]
  )

  useEffect(() => {
    let unsub = () => {}
    async function init() {
      const { data } = await supabase.auth.getSession()
      const u = data?.session?.user ?? null
      setUser(u); await checkAdmin(u)
    }
    init()
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      const u = s?.user ?? null
      setUser(u); checkAdmin(u)
    })
    unsub = () => sub?.subscription?.unsubscribe?.()
    return () => unsub()
  }, [])

  async function checkAdmin(u) {
    try {
      if (!u) return setIsAdmin(false)
      const { data, error } = await supabase.rpc('is_admin', { u: u.id })
      if (error) return setIsAdmin(false)
      setIsAdmin(Boolean(data))
    } catch { setIsAdmin(false) }
  }

  async function logout() { try { await supabase.auth.signOut() } finally { setOpen(false) } }

  // посилання меню (щоб не дублювати)
  const MenuLinks = ({ mobile = false }) => (
    <>
      <Link to="/" className={linkCls(mobile)} onClick={()=>setOpen(false)}>Каталог</Link>

      {user && (
        <Link to="/dashboard" className={linkCls(mobile)} onClick={()=>setOpen(false)}>
          Мої замовлення
        </Link>
      )}

      {user && (
        <Link to="/cart" className={linkCls(mobile) + ' relative'} onClick={()=>setOpen(false)}>
          <span>Кошик</span>
          {cartQty > 0 && (
            <span
              className={
                mobile
                ? 'ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-indigo-600 text-white'
                : 'absolute -top-2 -right-3 min-w-[20px] h-[20px] px-1 rounded-full bg-indigo-600 text-white text-[12px] leading-[20px] text-center'
              }
              title={`Товарів у кошику: ${cartQty}`}
            >
              {cartQty}
            </span>
          )}
        </Link>
      )}

      {isAdmin && (
        <>
          <Link to="/admin" className={linkCls(mobile)} onClick={()=>setOpen(false)}>Адмін</Link>
          <Link to="/admin/orders" className={linkCls(mobile)} onClick={()=>setOpen(false)}>Замовлення (адмін)</Link>
        </>
      )}

      <Link to="/about" className={linkCls(mobile)} onClick={()=>setOpen(false)}>Про нас</Link>
      <Link to="/contacts" className={linkCls(mobile)} onClick={()=>setOpen(false)}>Контакти</Link>
    </>
  )

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-3 h-14 flex items-center gap-3">
        {/* Лого + бургер */}
        <div className="flex items-center gap-3">
          <button
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200"
            onClick={() => setOpen(v => !v)}
            aria-label="Меню"
          >
            {open ? '✕' : '☰'}
          </button>
          <Link to="/" className="font-semibold text-indigo-600">Drop-UA</Link>
        </div>

        {/* Десктоп-меню */}
        <nav className="hidden md:flex items-center gap-4 text-sm">
          <MenuLinks />
        </nav>

        {/* Правий блок */}
        <div className="ml-auto hidden md:block">
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
            >
              Вхід / Реєстрація
            </Link>
          )}
        </div>
      </div>

      {/* Мобільне меню */}
      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="max-w-6xl mx-auto px-3 py-3 flex flex-col gap-2 text-base">
            <MenuLinks mobile />
            <div className="pt-2">
              {user ? (
                <button
                  onClick={logout}
                  className="w-full h-10 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50"
                >
                  Вийти
                </button>
              ) : (
                <Link
                  to="/login"
                  className="w-full h-10 px-4 inline-flex items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                  onClick={()=>setOpen(false)}
                >
                  Вхід / Реєстрація
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

function linkCls(mobile) {
  return mobile
    ? 'py-2 text-slate-700 hover:text-indigo-600'
    : 'hover:text-indigo-600 text-sm'
}
