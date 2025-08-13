// src/pages/Cart.jsx
import { useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useCart } from '../context/CartContext'

export default function Cart() {
  const cart = useCart()
  const items    = Array.isArray(cart?.items) ? cart.items : []
  const remove   = cart?.remove ?? (()=>{})
  const setPrice = cart?.setPrice ?? (()=>{})
  const setQty   = cart?.setQty ?? (()=>{})
  const inc      = cart?.inc ?? (()=>{})
  const dec      = cart?.dec ?? (()=>{})
  const totalFn  = typeof cart?.total === 'function' ? cart.total : () => 0

  const [form, setForm] = useState({
    recipient_name: '',
    recipient_phone: '',
    settlement: '',
    nova_poshta_branch: ''
  })
  const [sending, setSending] = useState(false)

  const total = useMemo(() => {
    try { return Number(totalFn()) || 0 } catch { return 0 }
  }, [totalFn, items])

  async function submit() {
    if (!items.length) return
    if (!form.recipient_name || !form.recipient_phone || !form.settlement || !form.nova_poshta_branch) {
      alert('Заповніть усі поля одержувача.'); return
    }
    setSending(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const user_id = userData?.user?.id || null

      // ✅ один номер для всіх рядків цього чеку
      const { data: ono, error: onoErr } = await supabase.rpc('next_order_no')
      if (onoErr) throw onoErr
      const order_no = ono

      const rows = items.map(it => ({
        order_no,
        user_id,
        product_id: it.id,
        qty: it.qty || 1,
        my_price: Number(it.my_price ?? it.price_dropship ?? 0),
        recipient_name: form.recipient_name,
        recipient_phone: form.recipient_phone,
        settlement: form.settlement,
        nova_poshta_branch: form.nova_poshta_branch,
        shipping_address: null
      }))

      const { error } = await supabase.from('orders').insert(rows)
      if (error) throw error

      alert(`Замовлення №${order_no} створено! Статус дивіться у «Мої замовлення».`)
      window.location.href = '/dashboard'
    } catch (e) {
      console.error(e)
      alert(e.message || 'Не вдалося створити замовлення')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="container-page my-6">
      <h2 className="h1 mb-4">Кошик</h2>

      <div className="card">
        {items.length === 0 && <div className="p-5 text-muted">Кошик порожній.</div>}

        {items.map((it) => {
          const unit = Number(it?.my_price ?? it?.price_dropship ?? 0)
          const line = unit * (it?.qty || 1)
          return (
            <div key={it.id} className="flex items-center gap-4 p-4 border-b last:border-b-0 border-slate-100">
              <div className="w-[110px] h-[80px] overflow-hidden rounded-xl bg-slate-100">
                {it?.image_url && <img src={it.image_url} alt={it?.name || ''} className="w-full h-full object-cover" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{it?.name || 'Товар'}</div>
                <div className="text-muted text-sm">Дроп-ціна: {Number(it?.price_dropship ?? 0).toFixed(2)} ₴</div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-sm text-muted">Ціна продажу</div>
                <input
                  className="input input-xs w-[110px] text-right"
                  value={String(unit)}
                  onChange={e => setPrice(it.id, e.target.value)}
                  inputMode="numeric"
                />
                <div className="text-sm text-muted">грн/шт</div>
              </div>

              <div className="flex items-center gap-1">
                <button className="btn-ghost input-xs" onClick={()=>dec(it.id)} aria-label="Зменшити">−</button>
                <input
                  className="input input-xs w-[64px] text-center"
                  value={String(it?.qty || 1)}
                  onChange={e => setQty(it.id, e.target.value)}
                  inputMode="numeric"
                />
                <button className="btn-ghost input-xs" onClick={()=>inc(it.id)} aria-label="Збільшити">+</button>
              </div>

              <div className="w-[120px] text-right font-semibold">{line.toFixed(2)} ₴</div>

              <button
                aria-label="Прибрати"
                onClick={() => remove(it.id)}
                className="w-9 h-9 rounded-full bg-white border border-slate-300 hover:bg-slate-50 flex items-center justify-center"
                title="Прибрати"
              >
                ×
              </button>
            </div>
          )
        })}
      </div>

      <div className="mt-4 text-[18px]">
        Всього:&nbsp;<span className="price text-[22px]">{total.toFixed(2)} ₴</span>
      </div>

      {items.length > 0 && (
        <div className="card mt-6">
          <div className="card-body">
            <div className="h2 mb-4">Дані одержувача</div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="ПІБ отримувача">
                <input className="input" value={form.recipient_name}
                  onChange={e=>setForm({...form, recipient_name:e.target.value})} placeholder="Ім'я Прізвище"/>
              </Field>
              <Field label="Телефон отримувача (+380…)">
                <input className="input" value={form.recipient_phone}
                  onChange={e=>setForm({...form, recipient_phone:e.target.value})} placeholder="+380…"/>
              </Field>
              <Field label="Населений пункт">
                <input className="input" value={form.settlement}
                  onChange={e=>setForm({...form, settlement:e.target.value})} placeholder="Київ"/>
              </Field>
              <Field label="Відділення Нової пошти">
                <input className="input" value={form.nova_poshta_branch}
                  onChange={e=>setForm({...form, nova_poshta_branch:e.target.value})} placeholder="Відділення №…"/>
              </Field>
            </div>

            <div className="mt-5 flex gap-3">
              <button className="btn-outline" onClick={()=>window.location.href='/'}>Продовжити покупки</button>
              <button className="btn-primary" disabled={sending} onClick={submit}>
                {sending ? 'Надсилаємо…' : 'Підтвердити замовлення'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-sm text-muted mb-1">{label}</div>
      {children}
    </div>
  )
}
