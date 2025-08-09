import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Admin(){
  const [me, setMe] = useState(null)
  const [profile, setProfile] = useState(null)
  const [prod, setProd] = useState({name:'', description:'', image_url:'', price_dropship:''})
  const [orders, setOrders] = useState([])

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession()
      const user = s.session?.user
      setMe(user)
      if(!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
      setProfile(p)
      if(p?.role === 'admin') await loadOrders()
    })()
  }, [])

  async function loadOrders(){
    const { data } = await supabase.from('orders').select('*, products(name)').order('created_at', { ascending:false })
    setOrders(data || [])
  }

  async function addProduct(e){
    e.preventDefault()
    const payload = { ...prod, price_dropship: Number(prod.price_dropship) }
    const { error } = await supabase.from('products').insert(payload)
    if(error){ alert(error.message); return }
    alert('Товар додано')
    setProd({name:'', description:'', image_url:'', price_dropship:''})
  }

  async function changeStatus(id, status){
    const { error } = await supabase.from('orders').update({ status }).eq('id', id)
    if(error){ alert(error.message); return }
    await loadOrders()
  }

  if(!me) return <p style={{padding:24}}>Спочатку увійдіть.</p>
  if(profile?.role !== 'admin') return <p style={{padding:24}}>Доступ лише для адміна.</p>

  return (
    <div style={{maxWidth:960, margin:'24px auto', display:'grid', gap:24}}>
      <section>
        <h3>Додати товар</h3>
        <form onSubmit={addProduct} style={{display:'grid', gap:8, maxWidth:520}}>
          <input placeholder="Назва" value={prod.name} onChange={e=>setProd({...prod, name:e.target.value})} required />
          <textarea placeholder="Опис" value={prod.description} onChange={e=>setProd({...prod, description:e.target.value})} />
          <input placeholder="Image URL" value={prod.image_url} onChange={e=>setProd({...prod, image_url:e.target.value})} />
          <input type="number" step="0.01" placeholder="Дроп‑ціна (₴)" value={prod.price_dropship} onChange={e=>setProd({...prod, price_dropship:e.target.value})} required />
          <button type="submit">Додати</button>
        </form>
      </section>

      <section>
        <h3>Усі замовлення</h3>
        <div style={{display:'grid', gap:12}}>
          {orders.map(o => (
            <div key={o.id} style={{border:'1px solid #eee', padding:12, borderRadius:8}}>
              <div style={{display:'flex', justifyContent:'space-between', gap:12}}>
                <div>
                  <b>{o.products?.name}</b> • qty {o.qty} • user {o.user_id.slice(0,8)}…
                  <div style={{color:'#555'}}>Сума продажу: {Number(o.my_price).toFixed(2)} ₴</div>
                  <div style={{color:'#777'}}>Отримувач: {o.recipient_name} — {o.settlement}, відділення НП: {o.nova_poshta_branch} • {o.recipient_phone}</div>
                </div>
                <div>
                  <select value={o.status} onChange={e=>changeStatus(o.id, e.target.value)}>
                    {['pending','processing','ordered','shipped','delivered','canceled'].map(s=> <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
          {orders.length===0 && <p>Поки немає замовлень.</p>}
        </div>
      </section>
    </div>
  )
}