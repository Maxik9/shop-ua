import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useEffect, useState } from 'react'
import { useCart } from '../context/CartContext'   // ⟵ додали

export default function NavBar() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(null)
  const { count } = useCart()                      // ⟵ лічильник кошика

  useEffect(() => {
    let unsubscribe = () => {}
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
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) supabase.rpc('is_admin', { u: u.id }).then(({ data }) => setIsAdmin(Boolean(data)))
      else setIsAdmin(false)
    })
    unsubscribe = () => sub.subscription.unsubscribe()
    return () => unsubscribe()
  }, [])

  async function logout() { await supabase.auth.signOut() }

  return (
    <nav style={{display:'flex', gap:12, padding:12, borderBottom:'1px solid #eee', alignItems:'center'}}>
      <Link to="/">Каталог</Link>
      {user && <Link to="/dashboard">Мої замовлення</Link>}
      {/* замість /new-order показуємо кошик */}
      {user && <Link to="/cart">Кошик{count ? ` (${count})` : ''}</Link>}
      {isAdmin === true && <Link to="/admin">Адмін</Link>}
      <Link to="/about">Про нас</Link>
      <Link to="/contacts">Контакти</Link>
      <div style={{marginLeft:'auto'}}>
        {user ? <button onClick={logout}>Вийти</button> : <Link to="/login">Вхід / Реєстрація</Link>}
      </div>
    </nav>
  )
}
