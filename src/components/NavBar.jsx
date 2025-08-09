
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useEffect, useState } from 'react'

export default function NavBar() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null) // null = роль ещё не загружена

  useEffect(() => {
    let unsubscribe = () => {}

    async function loadInitialData() {
      const { data } = await supabase.auth.getSession()
      const currentUser = data.session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        await fetchRole(currentUser.id)
      }
    }

    async function fetchRole(uid) {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', uid)
        .single()
      if (error) {
        console.warn('Ошибка получения роли:', error)
        setRole('user')
        return
      }
      setRole(data?.role || 'user')
    }

    loadInitialData()

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        fetchRole(currentUser.id)
      } else {
        setRole(null)
      }
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
      {/* Показываем "Адмін" только если роль загружена и это admin */}
      {role === 'admin' && <Link to="/admin">Адмін</Link>}
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
<span style={{background:'red', color:'#fff', padding:'2px 4px'}}>DEBUG_NAVBAR</span>
  )
}
