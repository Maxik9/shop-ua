import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Dashboard(){
  const [orders, setOrders] = useState([])

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession()
      const uid = session.session?.user?.id
      if(!uid) return
      const { data } = await supabase
        .from('orders')
        .select('*, products(name)')
        .order('created_at', { ascending:false })
      setOrders(data || [])
    })()
  }, [])

  return (
    <div style={{maxWidth:800, margin:'24px auto'}}>
      <h2>Мої замовлення</h2>
      <ul style={{display:'grid', gap:12, marginTop:12, listStyle:'none', padding:0}}>
        {orders.map(o => (
          <li key={o.id} style={{border:'1px solid #eee', padding:12, borderRadius:8}}>
            <div style={{display:'flex', justifyContent:'space-between'}}>
              <strong>{o.products?.name}</strong>
              <span>Статус: <b>{o.status}</b></span>
            </div>
            <div style={{color:'#555', marginTop:6}}>
              К-сть: {o.qty} • Моя ціна: {Number(o.my_price).toFixed(2)} ₴
            </div>
            <div style={{color:'#777', marginTop:6}}>
              Отримувач: {o.recipient_name} • {o.settlement}, відділення НП: {o.nova_poshta_branch}
            </div>
            {o.recipient_phone && <div style={{color:'#999', marginTop:4}}>Телефон отримувача: {o.recipient_phone}</div>}
          </li>
        ))}
      </ul>
      {orders.length===0 && <p>Поки немає замовлень.</p>}
    </div>
  )
}