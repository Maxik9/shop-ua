import { useCart } from '../context/CartContext'
import { useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'

export default function Cart() {
  const cart = useCart()
  const items   = Array.isArray(cart?.items) ? cart.items : []
  const remove  = typeof cart?.remove === 'function' ? cart.remove : () => {}
  const setPrice= typeof cart?.setPrice === 'function' ? cart.setPrice : () => {}
  const totalFn = typeof cart?.total === 'function' ? cart.total : () => 0

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
      alert('Заповніть усі поля одержувача.')
      return
    }
    setSending(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const user_id = userData?.user?.id || null

      for (const it of items) {
        await supabase.from('orders').insert({
          user_id,
          product_id: it.id,
          qty: 1,
          my_price: Number(it.my_price ?? it.price_dropship ?? 0),
          recipient_name: form.recipient_name,
          recipient_phone: form.recipient_phone,
          settlement: form.settlement,
          nova_poshta_branch: form.nova_poshta_branch,
          shipping_address: null
        })
      }
      alert('Замовлення надіслано! Статус можна переглянути у «Мої замовлення».')
      window.location.href = '/'
    } finally { setSending(false) }
  }

  return (
    <div className="container-page my-6">
      <h2 className="h1 mb-4">Кошик</h2>

      <div className="card">
        {items.length === 0 && <div className="p-5 text-muted">Кошик порожній.</div>}

        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-4 p-4 border-b last:border-b-0 border-slate-100">
            <div className="w-[110px] h-[80px] overflow-hidden rounded-xl bg-slate-100">
              {it?.image_url && <img src={it.image_url} alt={it?.name || ''} className="w-full h-full object-cover" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{it?.name || 'Товар'}</div>
              <div className="text-muted text-sm">
                Дроп-ціна: {Number(it?.price_dropship ?? 0).toFixed(2)} ₴
              </div>
            </div>

            {/* Ввід ціни продажу */}
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted">Сума продажу (грн)</div>
              <input
                className="input input-xs w-[120px] text-right"
                value={String(Number(it?.my_price ?? it?.price_dropship ?? 0))}
                onChange={e => setPrice(it.id, e.target.value)}
                inputMode="numeric"
              />
            </div>

            <button
              aria-label="Прибрати"
              onClick={() => remove(it.id)}
              className="w-9 h-9 rounded-full bg-white border border-slate-300 hover:bg-slate-50 flex items-center justify-center"
              title="Прибрати"
            >
              ×
            </button>
          </div>
        ))}
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
