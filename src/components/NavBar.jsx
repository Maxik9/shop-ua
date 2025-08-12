import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useEffect, useState } from 'react'
import { useCart } from '../context/CartContext'

export default function NavBar() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const { count } = useCart()

  useEffect(() => {
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
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      const u = s?.user ?? null
      setUser(u)
      if (u) supabase.rpc('is_admin', { u: u.id }).then(({ data }) => setIsAdmin(Boolean(data)))
      else setIsAdmin(false)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function logout(){ await supabase.auth.signOut() }

  const wrap = {background:'#fff', borderBottom:'1px solid #e5e7eb'}
  const row  = {maxWidth:1100, margin:'0 auto', padding:'8px 12px', display:'flex', alignItems:'center', gap:12}
  const link = {textDecoration:'none', color:'#1f2937'}
  const linkHover = {textDecoration:'underline'}
  const right = {marginLeft:'auto'}
  const badge = {display:'inline-flex', alignItems:'center', padding:'2px 6px', borderRadius:999, fontSize:12, background:'#eef2ff', color:'#3730a3', marginLeft:6}

  return (
    <header style={wrap}>
      <div style={row}>
        <Link to="/" style={{...link, fontWeight:600, color:'#4f46e5'}}>Drop-UA</Link>

        <nav style={{display:'flex', gap:12, fontSize:14}}>
          <Link to="/" style={link} onMouseOver={e=>Object.assign(e.currentTarget.style,linkHover)} onMouseOut={e=>e.currentTarget.style.textDecoration='none'}>Каталог</Link>
          {user && <Link to="/dashboard" style={link} onMouseOver={e=>Object.assign(e.currentTarget.style,linkHover)} onMouseOut={e=>e.currentTarget.style.textDecoration='none'}>Мої замовлення</Link>}
          {user && (
            <Link to="/cart" style={link} onMouseOver={e=>Object.assign(e.currentTarget.style,linkHover)} onMouseOut={e=>e.currentTarget.style.textDecoration='none'}>
              Кошик {count ? <span style={badge}>{count}</span> : null}
            </Link>
          )}
          {isAdmin && <Link to="/admin" style={link} onMouseOver={e=>Object.assign(e.currentTarget.style,linkHover)} onMouseOut={e=>e.currentTarget.style.textDecoration='none'}>Адмін</Link>}
          {isAdmin && <Link to="/admin/orders" style={link} onMouseOver={e=>Object.assign(e.currentTarget.style,linkHover)} onMouseOut={e=>e.currentTarget.style.textDecoration='none'}>Замовлення (адмін)</Link>}
          <Link to="/about" style={link} onMouseOver={e=>Object.assign(e.currentTarget.style,linkHover)} onMouseOut={e=>e.currentTarget.style.textDecoration='none'}>Про нас</Link>
          <Link to="/contacts" style={link} onMouseOver={e=>Object.assign(e.currentTarget.style,linkHover)} onMouseOut={e=>e.currentTarget.style.textDecoration='none'}>Контакти</Link>
        </nav>

        <div style={right}>
          {user ? (
            <button onClick={logout} style={{height:36, padding:'0 12px', border:'1px solid #d1d5db', borderRadius:8, background:'#fff', cursor:'pointer'}}>Вийти</button>
          ) : (
            <Link to="/login" style={{...link, background:'#4f46e5', color:'#fff', padding:'8px 12px', borderRadius:8}}>Вхід / Реєстрація</Link>
          )}
        </div>
      </div>
    </header>
  )
}
