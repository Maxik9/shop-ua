// src/pages/AdminOrders.jsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'

// Статуси: в БД зберігаємо технічні значення (як було),
// у UI показуємо українські назви
const STATUS = [
  { db: 'pending',    ua: 'Нове' },
  { db: 'processing', ua: 'В обробці' },
  { db: 'ordered',    ua: 'Замовлено' },
  { db: 'shipped',    ua: 'Відправлено' },
  { db: 'delivered',  ua: 'Доставлено' },
  { db: 'canceled',   ua: 'Скасовано' },
]
const labelUA = v => STATUS.find(s => s.db === v)?.ua ?? v

export default function AdminOrders() {
  const [isAdmin, setIsAdmin] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [q, setQ] = useState('') // пошук по імені/телефону/місту
  const [limit, setLimit] = useState(50)

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession()
      const u = data.session?.user
      if (!u) { setIsAdmin(false); return }
      const { data: ok } = await supabase.rpc('is_admin', { u: u.id })
      setIsAdmin(Boolean(ok))
      if (ok) load()
    }
    init()
  }, [filterStatus, q, limit])

  async function load() {
    setLoading(true)

    let query = supabase
      .from('orders')
      // забираємо пов’язану інфу: товар і профіль клієнта
      .select(`
        id, created_at, status, qty, my_price,
        recipient_name, recipient_phone, settlement, nova_poshta_branch,
        product_id,
        products:product_id ( name, price_dropship, image_url ),
        profiles:user_id ( user_id, full_name, phone )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (filterStatus !== 'all') query = query.eq('status', filterStatus)

    const { data, error } = await query
    if (error) console.warn(error)
    setOrders(data || [])
    setLoading(false)
  }

  async function updateField(id, patch) {
    const { error } = await supabase.from('orders').update(patch).eq('id', id)
    if (error) alert('Помилка збереження: ' + error.message)
    else setOrders(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o))
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return orders
    return orders.filter(o => {
      const pool = [
        o?.profiles?.full_name,
        o?.profiles?.phone,
        o?.recipient_name,
        o?.recipient_phone,
        o?.settlement,
        o?.products?.name,
      ].join(' ').toLowerCase()
      return pool.includes(needle)
    })
  }, [orders, q])

  if (isAdmin === null) return <p style={{padding:24}}>Перевірка доступу…</p>
  if (!isAdmin) return (
    <div style={{padding:24}}>
      <p>Доступ лише для адміна.</p>
      <Link to="/">На головну</Link>
    </div>
  )

  return (
    <div style={{maxWidth:1200, margin:'24px auto', padding:'0 12px'}}>
      <div style={{display:'flex', gap:12, alignItems:'center', marginBottom:16}}>
        <h2 style={{margin:0}}>Замовлення</h2>
        <Link to="/admin" style={{marginLeft:'auto'}}>→ Керування товарами</Link>
      </div>

      {/* Фільтри */}
      <div style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:12}}>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="all">Усі статуси</option>
          {STATUS.map(s => <option key={s.db} value={s.db}>{s.ua}</option>)}
        </select>
        <input
          placeholder="Пошук (клієнт/телефон/місто/товар)"
          value={q}
          onChange={e=>setQ(e.target.value)}
          style={{minWidth:260}}
        />
        <select value={limit} onChange={e=>setLimit(Number(e.target.value))}>
          {[20,50,100,200].map(n => <option key={n} value={n}>Показати {n}</option>)}
        </select>
        <button onClick={load} disabled={loading}>Оновити</button>
      </div>

      {/* Табличний список */}
      <div style={{display:'grid', gap:8}}>
        {loading && <p>Завантаження…</p>}
        {!loading && filtered.length === 0 && <p>Немає замовлень.</p>}

        {filtered.map(o => (
          <div key={o.id} style={{border:'1px solid #eee', borderRadius:8, padding:10}}>
            <div style={{display:'grid', gridTemplateColumns:'80px 1fr 220px 160px 140px', gap:10, alignItems:'center'}}>
              {/* превʼю товару */}
              <div style={{width:80, height:80, background:'#f6f6f6', borderRadius:6, overflow:'hidden'}}>
                {o.products?.image_url && (
                  <img src={o.products.image_url} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                )}
              </div>

              {/* товар + клієнт */}
              <div>
                <div style={{fontWeight:600}}>{o.products?.name || 'Товар'}</div>
                <div style={{fontSize:12, color:'#666'}}>
                  Клієнт: <b>{o.profiles?.full_name || '—'}</b> {o.profiles?.phone ? `(${o.profiles.phone})` : ''}
                </div>
                <div style={{fontSize:12, color:'#666'}}>Створено: {new Date(o.created_at).toLocaleString()}</div>
              </div>

              {/* статус */}
              <div>
                <label style={{fontSize:12, color:'#555'}}>Статус</label>
                <select
                  value={o.status}
                  onChange={e=>updateField(o.id, { status: e.target.value })}
                  style={{width:'100%'}}
                >
                  {STATUS.map(s => <option key={s.db} value={s.db}>{s.ua}</option>)}
                </select>
              </div>

              {/* кількість / ціна продажу */}
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:6}}>
                <div>
                  <label style={{fontSize:12, color:'#555'}}>К-сть</label>
                  <input
                    type="number" min={1}
                    defaultValue={o.qty}
                    onBlur={e=>updateField(o.id, { qty: Number(e.target.value)||1 })}
                  />
                </div>
                <div>
                  <label style={{fontSize:12, color:'#555'}}>Сума (грн)</label>
                  <input
                    type="number" step="0.01" min={0}
                    defaultValue={o.my_price}
                    onBlur={e=>updateField(o.id, { my_price: Number(e.target.value)||0 })}
                  />
                </div>
              </div>

              {/* отримувач */}
              <div>
                <div style={{display:'grid', gap:6}}>
                  <input
                    placeholder="ПІБ отримувача"
                    defaultValue={o.recipient_name || ''}
                    onBlur={e=>updateField(o.id, { recipient_name: e.target.value || null })}
                  />
                  <input
                    placeholder="Телефон"
                    defaultValue={o.recipient_phone || ''}
                    onBlur={e=>updateField(o.id, { recipient_phone: e.target.value || null })}
                  />
                  <input
                    placeholder="Населений пункт"
                    defaultValue={o.settlement || ''}
                    onBlur={e=>updateField(o.id, { settlement: e.target.value || null })}
                  />
                  <input
                    placeholder="Відділення НП"
                    defaultValue={o.nova_poshta_branch || ''}
                    onBlur={e=>updateField(o.id, { nova_poshta_branch: e.target.value || null })}
                  />
                </div>
              </div>
            </div>

            {/* нижній ряд — суми */}
            <div style={{marginTop:8, display:'flex', gap:16, flexWrap:'wrap', alignItems:'center'}}>
              <small style={{color:'#666'}}>
                Дроп-ціна: {Number(o.products?.price_dropship || 0).toFixed(2)} ₴
              </small>
              <small style={{color:'#666'}}>
                До сплати клієнтом: <b>{(Number(o.my_price||0) * (o.qty||1)).toFixed(2)} ₴</b>
              </small>
              <small style={{color:'#666'}}>
                Маржа (за позицію): {(Number(o.my_price||0) - Number(o.products?.price_dropship||0)).toFixed(2)} ₴
              </small>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
