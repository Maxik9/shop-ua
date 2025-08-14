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
    // закривати бургер при зміні сторінки
    setOpen(false)
  }, [loc.pathname])

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

  function submitSearch(e){
    e.preventDefault()
    const q = term.trim()
    nav(q ? `/search?q=${encodeURIComponent(q)}` : `/search`)
  }

  const NavLinks = ({onClick}) => (
    <>
      <Link to="/" onClick={onClick} className="hover:text-indigo-600">Каталог</Link>
      {user && <Link to="/dashboard" onClick={onClick} className="hover:text-indigo-600">Мої замовлення</Link>}
      {isAdmin && <Link to="/admin" onClick={onClick} className="hover:text-indigo-600">Адмін</Link>}
      <Link to="/about" onClick={onClick} className="hover:text-indigo-600">Про нас</Link>
      <Link to="/contacts" onClick={onClick} className="hover:text-indigo-600">Контакти</Link>
    </>
  )

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-3 h-14 flex items-center gap-3">
        {/* Бургер */}
        <button
          className="md:hidden w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center"
          onClick={() => setOpen(v => !v)}
          aria-label="Меню"
        >
          {!open ? (
            // стандартний бургер
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          ) : (
            // хрестик
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          )}
        </button>

        <Link to="/" className="font-semibold text-indigo-600">Drop-UA</Link>

        {/* Десктоп-меню */}
        <nav className="hidden md:flex items-center gap-4 text-sm">
          <NavLinks />
        </nav>

        {/* Пошук (десктоп) */}
        <form onSubmit={submitSearch} className="hidden md:block ml-auto">
          <div className="relative">
            <input
              className="input pl-9 w-[280px]"
              placeholder="Пошук товарів…"
              value={term}
              onChange={e=>setTerm(e.target.value)}
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l3.387 3.387a1 1 0 01-1.414 1.414l-3.387-3.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" clipRule="evenodd" />
            </svg>
          </div>
        </form>

        {/* Кошик + кнопки (моб/десктоп) */}
        <div className="md:ml-3 ml-auto flex items-center gap-2">
          {/* кнопка пошуку на мобільному */}
          <Link to="/search" className="md:hidden w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center" title="Пошук">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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

          {user ? (
            <button onClick={logout} className="hidden md:inline-flex h-10 px-3 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50">
              Вийти
            </button>
          ) : (
            <Link to="/login" className="hidden md:inline-flex h-10 px-3 text-sm items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
              Вхід / Реєстрація
            </Link>
          )}
        </div>
      </div>

      {/* Дропдаун бургер-меню (мобільний) */}
      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="max-w-6xl mx-auto px-3 py-3 flex flex-col gap-3 text-sm">
            {/* пошук у меню на мобі */}
            <form onSubmit={submitSearch}>
              <input
                className="input"
                placeholder="Пошук товарів…"
                value={term}
                onChange={e=>setTerm(e.target.value)}
              />
            </form>
            <NavLinks onClick={() => setOpen(false)} />
            <div className="pt-2">
              {user ? (
                <button onClick={logout} className="h-9 px-3 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50 w-full">
                  Вийти
                </button>
              ) : (
                <Link to="/login" className="h-9 px-3 text-sm inline-flex items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 w-full">
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
