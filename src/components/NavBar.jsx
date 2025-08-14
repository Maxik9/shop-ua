import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useEffect, useState } from 'react'
import { useCart } from '../context/CartContext'

export default function NavBar() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const { count } = useCart()
  const nav = useNavigate()
  const loc = useLocation()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    (async () => {
      if (!user) { setIsAdmin(false); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setIsAdmin(data?.role === 'admin')
    })()
  }, [user])

  function submitSearch(e) {
    e.preventDefault()
    const q = term.trim()
    if (q.length < 2) return
    nav(`/search?q=${encodeURIComponent(q)}`)
    setOpen(false)
  }

  function toggleOpen() {
    setOpen(o => !o)
  }
  async function logout() {
    await supabase.auth.signOut()
    if (loc.pathname.startsWith('/admin')) nav('/')
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-3 h-16 flex items-center gap-3">
        {/* Лого */}
        <Link to="/" className="font-extrabold text-xl text-indigo-600">Drop-UA</Link>

        {/* Навігація */}
        <nav className="hidden md:flex items-center gap-4 text-sm">
          <Link to="/catalog" className="hover:underline">Каталог</Link>
          <Link to="/orders" className="hover:underline">Мої замовлення</Link>
          {isAdmin && <Link to="/admin" className="hover:underline">Адмін</Link>}
          <Link to="/about" className="hover:underline">Про нас</Link>
          <Link to="/contacts" className="hover:underline">Контакти</Link>
        </nav>

        {/* Пошук (десктоп) */}
        <form onSubmit={submitSearch} className="hidden md:block ml-auto">
          <div className="relative">
            <input
              className="input input--with-icon w-[280px]"
              placeholder="Пошук товарів…"
              value={term}
              onChange={e=>setTerm(e.target.value)}
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.9 14.32a8 8 0 111.41-1.41l4.39 4.39a1 1 0 01-1.42 1.42l-4.38-4.4zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" clipRule="evenodd" />
            </svg>
          </div>
        </form>

        {/* Кнопки справа */}
        <div className="ml-2 flex items-center gap-2">
          {/* Мобільна кнопка пошуку */}
          <Link to="/search" className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-300 hover:bg-slate-50" title="Пошук">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </Link>

          <Link to="/cart" className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-300 hover:bg-slate-50" title="Кошик">
            🛒
            {count > 0 && (
              <span className="absolute -top-1 -right-1 rounded-full bg-indigo-600 text-white text-[11px] leading-4 w-5 h-5 text-center">
                {count}
              </span>
            )}
          </Link>

          {/* Вхід/Вихід */}
          {user ? (
            <button onClick={logout} className="hidden md:inline-flex h-10 px-3 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50">
              Вийти
            </button>
          ) : (
            <Link to="/login" className="hidden md:inline-flex h-10 px-3 text-sm items-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
              Вхід / Реєстрація
            </Link>
          )}

          {/* Бургер */}
          <button className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-300"
            onClick={toggleOpen} aria-label="Menu">☰</button>
        </div>
      </div>

      {/* Дропдаун бургер-меню (мобільний) */}
      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="max-w-6xl mx-auto px-3 py-3 flex flex-col gap-3 text-sm">
            {/* пошук у меню на мобі */}
            <form onSubmit={submitSearch}>
              <div className="relative">
                <input
                  className="input input--with-icon"
                  placeholder="Пошук товарів…"
                  value={term}
                  onChange={e=>setTerm(e.target.value)}
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.9 14.32a8 8 0 111.41-1.41l4.39 4.39a1 1 0 01-1.42 1.42l-4.38-4.4zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" clipRule="evenodd" />
                </svg>
              </div>
            </form>

            <Link to="/catalog" onClick={()=>setOpen(false)}>Каталог</Link>
            <Link to="/orders" onClick={()=>setOpen(false)}>Мої замовлення</Link>
            {isAdmin && <Link to="/admin" onClick={()=>setOpen(false)}>Адмін</Link>}
            <Link to="/about" onClick={()=>setOpen(false)}>Про нас</Link>
            <Link to="/contacts" onClick={()=>setOpen(false)}>Контакти</Link>

            {user ? (
              <button onClick={logout} className="h-9 px-3 text-sm inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white hover:bg-slate-50 w-full">
                Вийти
              </button>
            ) : (
              <Link to="/login" className="h-9 px-3 text-sm inline-flex items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 w-full">
                Вхід / Реєстрація
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
