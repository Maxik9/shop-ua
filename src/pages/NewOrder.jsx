import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useLocation, useNavigate } from 'react-router-dom'

export default function NewOrder(){
  const { state } = useLocation()
  const nav = useNavigate()
  const [products, setProducts] = useState([])
  const [form, setForm] = useState({
    product_id:'', qty:1, my_price:'',
    recipient_name:'', recipient_phone:'',
    settlement:'', nova_poshta_branch:'', shipping_address:''
  })
  const chosen = useMemo(()=> products.find(p=>p.id===form.product_id), [products, form.product_id])

  useEffect(() => {
    async function load(){
      const { data } = await supabase.from('products').select('*').order('created_at', { ascending:false })
      setProducts(data || [])
      if(state?.product){
        setForm(f => ({...f, product_id: state.product.id, my_price: state.product.price_dropship}))
      }
    }
    load()
  }, [state])

  function update(k,v){ setForm(f => ({...f, [k]:v})) }

  async function submit(e){
    e.preventDefault()
    const { data: s } = await supabase.auth.getSession()
    const uid = s.session?.user?.id
    if(!uid) { alert('Спочатку увійдіть'); return }
    const payload = { ...form, qty: Number(form.qty), my_price: Number(form.my_price), user_id: uid }
    const { error } = await supabase.from('orders').insert(payload)
    if(error) { alert(error.message); return }
    alert('Замовлення створено!')
    nav('/dashboard')
  }

  return (
    <div style={{maxWidth:640, margin:'24px auto'}}>
      <h2>Оформити замовлення</h2>
      <form onSubmit={submit} style={{display:'grid', gap:12, marginTop:12}}>
        <select value={form.product_id} onChange={e=>update('product_id', e.target.value)} required>
          <option value="">Оберіть товар…</option>
          {products.map(p=> <option key={p.id} value={p.id}>{p.name} — {Number(p.price_dropship).toFixed(2)} ₴</option>)}
        </select>
        {chosen && (
          <div style={{fontSize:14, color:'#555'}}>Дроп‑ціна товару: <b>{Number(chosen.price_dropship).toFixed(2)} ₴</b></div>
        )}
        <input type="number" min={1} value={form.qty} onChange={e=>update('qty', e.target.value)} placeholder="Кількість" required />
        <input type="number" step="0.01" value={form.my_price} onChange={e=>update('my_price', e.target.value)} placeholder="Сума продажу (грн)" required />
        <input value={form.recipient_name} onChange={e=>update('recipient_name', e.target.value)} placeholder="ПІБ отримувача" required />
        <input value={form.recipient_phone} onChange={e=>update('recipient_phone', e.target.value)} placeholder="Телефон отримувача" required />
        <input value={form.settlement} onChange={e=>update('settlement', e.target.value)} placeholder="Населений пункт" required />
        <input value={form.nova_poshta_branch} onChange={e=>update('nova_poshta_branch', e.target.value)} placeholder="Відділення Нової пошти" required />
        <textarea value={form.shipping_address} onChange={e=>update('shipping_address', e.target.value)} placeholder="Адреса (вулиця, будинок, квартира) — за потреби" />
        <button type="submit">Створити замовлення</button>
      </form>
    </div>
  )
}