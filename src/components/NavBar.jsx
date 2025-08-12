import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useEffect, useState } from 'react'
import { useCart } from '../context/CartContext'

export default function NavBar() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(null) // null = ще не знаємо, true/false = відомо
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
      } else {
        setIsAdmin(false)
      }
    }
    init()

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
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
  }

  return (
    <nav style={{display:'flex', gap:12, padding:12, borderBottom:'1px solid #eee', alignItems:'center'}}>
      <Link to="/">Каталог</Link>
      {user && <Link to="/dashboard">Мої замовлення</Link>}
      {user && <Link to="/cart">Кошик{count ? ` (${count})` : ''}</Link>}

      {/* Адмінські лінки показуємо лише коли точно знаємо, що це адмін */}
      {isAdmin === true && <Link to="/admin">Адмін</Link>}
      {isAdmin === true && <Link to="/admin/orders">Замовлення (адмін)</Link>}

      <Link to="/about">Про нас</Link>
      <Link to="/contacts">Контакти</Link>

      <div style={{marginLeft:'auto'}}>
        {user ? (
          <button onClick={logout}>Вийти</button>
        ) : (
          <Link to="/login">Вхід / Реєстрація</Link>
        )}
      </div>
    </nav>
  )
}
