import { useCart } from '../context/CartContext'
import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Cart() {
  const { items, remove, total } = useCart()
  const [form, setForm] = useState({
    recipient_name: '', recipient_phone: '',
    settlement: '', nova_poshta_branch: ''
  })
  const [sending, setSending] = useState(false)

  async function submit() {
    if (!items.length) return
    if (!form.recipient_name || !form.recipient_phone || !form.settlement || !form.nova_poshta_branch) return
    setSending(true)
    try {
      // создаём по заказу на товар
      for (const it of items) {
        await supabase.from('orders').insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          product_id: it.id,
          qty: 1,
          my_price: it.my_price || it.price_dropship,
          recipient_name: form.recipient_name,
          recipient_phone: form.recipient_phone,
          settlement: form.settlement,
          nova_poshta_branch: form.nova_poshta_branch,
          shipping_address: null
        })
      }
      alert('Замовлення відправлено! Статус можна переглянути у «Мої замовлення».')
      window.location.href = '/'
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="container-page my-6">
      <h2 className="h1 mb-4">Кошик</h2>

      {/* Список позиций */}
      <div className="card">
        {items.length === 0 && <div className="p-5 text-muted">Кошик порожній.</div>}

        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-4 p-4 border-b last:border-b-0 border-slate-100">
            <div className="w-[110px] h-[80px] overflow-hidden rounded-xl bg-slate-100">
              {it.image_url && <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />}
            </div>

            <div className="flex-1">
              <div className="font-semibold">{it.name}</div>
              <div className="text-muted text-sm">Дроп-ціна: {Number(it.price_dropship).toFixed(2)} ₴</div>
            </div>

            <div className="w-[120px] text-right font-bold">{Number(it.my_price || it.price_dropship).toFixed(0)}</div>

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

      {/* Итог */}
      <div className="mt-4 text-[18px]">Всього:&nbsp; <span className="price text-[22px]">{Number(total()).toFixed(2)} ₴</span></div>

      {/* Форма получения */}
      {items.length > 0 && (
        <div className="card mt-6">
          <div className="card-body">
            <div className="h2 mb-4">Дані одержувача</div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted mb-1">ПІБ отримувача</div>
                <input className="input" value={form.recipient_name} onChange={e=>setForm({...form, recipient_name:e.target.value})} placeholder="Ім'я Прізвище" />
              </div>
              <div>
                <div className="text-sm text-muted mb-1">Телефон отримувача (+380…)</div>
                <input className="input" value={form.recipient_phone} onChange={e=>setForm({...form, recipient_phone:e.target.value})} placeholder="+380…" />
              </div>
              <div>
                <div className="text-sm text-muted mb-1">Населений пункт</div>
                <input className="input" value={form.settlement} onChange={e=>setForm({...form, settlement:e.target.value})} placeholder="Київ" />
              </div>
              <div>
                <div className="text-sm text-muted mb-1">Відділення Нової пошти</div>
                <input className="input" value={form.nova_poshta_branch} onChange={e=>setForm({...form, nova_poshta_branch:e.target.value})} placeholder="Відділення №…" />
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button className="btn-outline" onClick={()=>window.location.href='/' }>Продовжити покупки</button>
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
