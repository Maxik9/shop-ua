// src/components/NavBar.jsx
import { Link, NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useCart } from '../context/CartContext'

export default function NavBar() {
  const { count } = useCart()

  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null) // 'admin' | 'user' | null (ще не завантажено)

  useEffect(() => {
    let unsubscribe = () => {}

    async function prime() {
      // 1) Поточна сесія
      const { data } = await supabase.auth.getSession()
      const u = data.session?.user ?? null
      setUser(u)

      // 2) Підтягнути роль лише для себе
      if (u) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', u.id)
          .single()
        setRole(prof?.role || 'user')
      } else {
        setRole('user')
      }
    }

    prime()

    // 3) Реакція на зміну сесії
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        supabase
          .from('profiles')
          .select('role')
          .eq('user_id', u.id)
          .single()
          .then(({ data }) => setRole(data?.role || 'user'))
      } else {
        setRole('user')
      }
    })
    unsubscribe = () => sub?.subscription?.unsubscribe?.()

    return () => unsubscribe()
  }, [])

  async function logout() {
    await supabase.auth.signOut()
  }

  return (
    <header className="bg-white/90 backdrop-blur border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-3 h-14 flex items-center gap-3">
        {/* Лого */}
        <Link to="/" className="font-semibold text-indigo-600 text-lg">
          Drop-UA
        </Link>

        {/* Desktop навігація */}
        <nav className="hidden md:flex items-center gap-4 text-sm">
          <NavLink to="/" className={({isActive}) => isActive ? 'text-indigo-600' : 'hover:text-indigo-600'}>Каталог</NavLink>
          {user && (
            <NavLink to="/dashboard" className={({isActive}) => isActive ? 'text-indigo-600' : 'hover:text-indigo-600'}>
              Мої замовлення
            </NavLink>
          )}
          {role === 'admin' && (
            <>
              <NavLink to="/admin" className={({isActive}) => isActive ? 'text-indigo-600' : 'hover:text-indigo-600'}>
                Адмін
              </NavLink>
              <NavLink to="/admin/orders" className={({isActive}) => isActive ? 'text-indigo-600' : 'hover:text-indigo-600'}>
                Замовлення (адмін)
              </NavLink>
            </>
          )}
          <NavLink to="/about" className={({isActive}) => isActive ? 'text-indigo-600' : 'hover:text-indigo-600'}>Про нас</NavLink>
          <NavLink to="/contacts" className={({isActive}) => isActive ? 'text-indigo-600' : 'hover:text-indigo-600'}>Контакти</NavLink>
        </nav>

        {/* Справа — іконка кошика з бейджем */}
        <div className="ml-auto flex items-center gap-3">
          <Link
            to="/cart"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white hover:bg-slate-50"
            title="Кошик"
          >
            {/* проста іконка кошика (SVG) */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-slate-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3 3h2l.4 2M7 13h10l3-8H6.4M7 13L5.4 5M7 13l-2 7m12-7l2 7m-8-7v7m4-7v7" />
            </svg>

            {/* бейдж із сумою qty */}
            {count > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-[11px] leading-[18px] text-center">
                {count}
              </span>
            )}
          </Link>

          {/* Кнопки входу/виходу */}
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

        {/* Mobile: спрощене меню (опціонально можна додати бургер) */}
        <nav className="md:hidden ml-2 flex items-center gap-3 text-sm">
          <NavLink to="/" className="hover:text-indigo-600">Каталог</NavLink>
          {user && <NavLink to="/dashboard" className="hover:text-indigo-600">Замовлення</NavLink>}
          {role === 'admin' && <NavLink to="/admin" className="hover:text-indigo-600">Адмін</NavLink>}
        </nav>
      </div>
    </header>
  )
}
