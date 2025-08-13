// src/components/NavBar.jsx
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useEffect, useMemo, useState } from 'react'
import { useCart } from '../context/CartContext'

export default function NavBar() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // Беремо товари з контексту і рахуємо загальну кількість штук
  const { items = [] } = useCart()
  const cartQty = useMemo(
    () => items.reduce((s, it) => s + Number(it?.qty || 0), 0),
    [items]
  )

  useEffect(() => {
    let unsubscribe = () => {}

    async function check(u) {
      try {
        if (!u) {
          setIsAdmin(false)
          return
        }
        const { data, error } = await supabase.rpc('is_admin', { u: u.id })
        if (error) {
          console.warn('is_admin RPC error:', error)
          setIsAdmin(false)
          return
        }
        setIsAdmin(Boolean(data))
      } catch (e) {
        console.warn('is_admin RPC failed:', e)
        setIsAdmin(false)
      }
    }

    async function init() {
      const { data } = await supabase.auth.getSession()
      const u = data?.session?.user ?? null
      setUser(u)
      await check(u)
    }
    init()

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user ?? null
      setUser(u)
      check(u)
    })
    unsubscribe = () => sub?.subscription?.unsubscribe?.()

    return () => unsubscribe()
  }, [])

  async function logout() {
    try {
      await supabase.auth.signOut()
    } catch {}
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-3 h-14 flex items-center gap-4">
        <Link to="/" className="font-semibold text-indigo-600">Drop-UA</Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link to="/" className="hover:text-indigo-600">Каталог</Link>

          {user && (
            <Link to="/dashboard" className="hover:text-indigo-600">
              Мої замовлення
            </Link>
          )}

          {user && (
            <Link to="/cart" className="hover:text-indigo-600 relative">
              <span>Кошик</span>
              {cartQty > 0 && (
                <span
                  className="absolute -top-2 -right-3 min-w-[20px] h-[20px] px-1
                             rounded-full bg-indigo-600 text-white text-[12px]
                             leading-[20px] text-center"
                  title={`Товарів у кошику: ${cartQty}`}
                >
                  {cartQty}
                </span>
              )}
            </Link>
          )}

          {isAdmin && (
            <>
              <Link to="/admin" className="hover:text-indigo-600">Адмін</Link>
              <Link to="/admin/orders" className="hover:text-indigo-600">Замовлення (адмін)</Link>
            </>
          )}

          <Link to="/about" className="hover:text-indigo-600">Про нас</Link>
          <Link to="/contacts" className="hover:text-indigo-600">Контакти</Link>
        </nav>

        <div className="ml-auto">
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
    </header>
  )
}
