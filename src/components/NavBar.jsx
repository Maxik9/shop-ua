import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useEffect, useState } from 'react'

export default function NavBar() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(null) // null = ещё не знаем; true/false

  useEffect(() => {
    let unsubscribe = () => {}

    async function init() {
      const { data } = await supabase.auth.getSession()
      const u = data.session?.user ?? null
      setUser(u)
      if (u) checkAdmin(u.id); else setIsAdmin(false)
    }

    async function checkAdmin(uid) {
      // спрашиваем БД функцией public.is_admin(u uuid) → boolean
      const { data, error } = await supabase.rpc('is_admin', { u: uid })
      setIsAdmin(error ? false : Boolean(data))
    }

    init()
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) checkAdmin(u.id); else setIsAdmin(false)
    })
    unsubscribe = () => sub.subscription.unsubscribe()

    return () => unsubscribe()
  }, [])

  async function logout() {
    await supabase.auth.signOut()
  }

  return (
    <nav style={{display:'flex', gap:12, padding:12, borderBottom:'1px solid #eee', alignItems:'center'}}>
      <Link to="/">Каталог</Link>
      {user && <Link to="/dashboard">Мої замовлення</Link>}
      {user && <Link to="/new-order">Оформити замовлення</Link>}
      {isAdmin === true && <Link to="/admin">Адмін</Link>}
      <Link to="/about">Про нас</Link>
      <Link to="/contacts">Контакти</Link>
      <div style={{marginLeft:'auto'}}>
        {user ? <button onClick={logout}>Вийти</button> : <Link to="/login">Вхід / Реєстрація</Link>}
      </div>
    </nav>
  )
}
