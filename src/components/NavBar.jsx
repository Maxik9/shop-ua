import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useEffect, useState } from 'react'

export default function NavBar() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user || null))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null))
    return () => sub.subscription.unsubscribe()
  }, [])

  async function logout() { await supabase.auth.signOut() }

  return (
    <nav style={{display:'flex', gap:12, padding:12, borderBottom:'1px solid #eee', alignItems:'center'}}>
      <Link to="/">Каталог</Link>
      {user && <Link to="/dashboard">Мої замовлення</Link>}
      {user && <Link to="/new-order">Оформити замовлення</Link>}
      {user && <Link to="/admin">Адмін</Link>}
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