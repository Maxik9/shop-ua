import { useEffect, useState } from 'react'
import { useCart } from '../context/CartContext'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function Cart() {
  const { items, setQty, setPrice, remove, clear } = useCart()
  const [recipient_name, setName] = useState('')
  const [recipient_phone, setPhone] = useState('')
  const [settlement, setSettlement] = useState('')
  const [nova_poshta_branch, setBranch] = useState('')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  const total = items.reduce((s,i)=> s + (Number(i.my_price)||0) * i.qty, 0)

  useEffect(() => {
    // можна підставити телефон/ПІБ з профілю, якщо хочеш
  }, [])

  async function checkout(e){
    e.preventDefault()
    if (!items.length) return alert('Кошик порожній')
    if (!recipient_name || !recipient_phone || !settlement || !nova_poshta_branch) {
      return alert('Заповніть усі поля одержувача')
    }
    setLoading(true)

    const { data: s } = await supabase.auth.getSession()
    const uid = s.session?.user?.id
    if (!uid) { setLoading(false); return alert('Потрібно увійти') }

    // Створюємо по замовленню на кожну позицію
    const payloads = items.map(i => ({
      user_id: uid,
      product_id: i.id,
      qty: i.qty,
      my_price: Number(i.my_price)||0,
      recipient_name,
      recipient_phone,
      settlement,
      nova_poshta_branch,
      shipping_address: null,
      status: 'pending'
    }))

    const { error } = await supabase.from('orders').insert(payloads)
    setLoading(false)
    if (error) {
      return alert('Помилка створення замовлення: ' + error.message)
    }

    clear()
    alert('Замовлення створено! Статус: pending')
    nav('/dashboard')
  }

  return (
    <div style={{maxWidth:980, margin:'24px auto', padding:'0 12px'}}>
      <h2>Кошик</h2>
      {!items.length && <p>Кошик порожній.</p>}

      {items.length > 0 && (
        <>
          <div style={{display:'grid', gap:8, marginBottom:16}}>
            {items.map(i => (
              <div key={i.id} style={{display:'grid', gridTemplateColumns:'80px 1fr 160px 120px auto', gap:8, alignItems:'center', border:'1px solid #eee', borderRadius:8, padding:8}}>
                <div style={{width:80, height:80, background:'#f6f6f6', borderRadius:6, overflow:'hidden'}}>
                  {i.image_url && <img src={i.image_url} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}} />}
                </div>
                <div>
                  <div style={{fontWeight:600}}>{i.name}</div>
                  <div style={{fontSize:12, color:'#777'}}>Дроп-ціна: {Number(i.price_dropship).toFixed(2)} ₴</div>
                </div>
                <div>
                  <label style={{fontSize:12, color:'#555'}}>Кількість</label>
                  <input type="number" min={1} value={i.qty} onChange={e=>setQty(i.id, Number(e.target.value))} />
                </div>
                <div>
                  <label style={{fontSize:12, color:'#555'}}>Сума продажу (грн)</label>
                  <input type="number" step="0.01" min="0" value={i.my_price} onChange={e=>setPrice(i.id, e.target.value)} />
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontWeight:600}}>{(Number(i.my_price||0)*i.qty).toFixed(2)} ₴</div>
                  <button onClick={()=>remove(i.id)} style={{marginTop:6}}>Прибрати</button>
                </div>
              </div>
            ))}
          </div>

          <div style={{margin:'12px 0', fontSize:18}}>Всього: <b>{total.toFixed(2)} ₴</b></div>

          <h3>Дані одержувача</h3>
          <form onSubmit={checkout} style={{display:'grid', gap:12, maxWidth:520}}>
            <input placeholder="ПІБ отримувача" value={recipient_name} onChange={e=>setName(e.target.value)} required />
            <input placeholder="Телефон отримувача (+380...)" value={recipient_phone} onChange={e=>setPhone(e.target.value)} required />
            <input placeholder="Населений пункт" value={settlement} onChange={e=>setSettlement(e.target.value)} required />
            <input placeholder="Відділення Нової пошти" value={nova_poshta_branch} onChange={e=>setBranch(e.target.value)} required />
            <button type="submit" disabled={loading}>{loading ? 'Створюємо...' : 'Підтвердити замовлення'}</button>
          </form>
        </>
      )}
    </div>
  )
}
