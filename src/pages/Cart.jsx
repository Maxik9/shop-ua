import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useCart } from '../context/CartContext'
import { Link, useNavigate } from 'react-router-dom'

export default function Cart() {
  const nav = useNavigate()
  const { items, removeItem, setQty, setMyPrice, clearCart } = useCart()

  // Дані одержувача
  const [recipientName, setRecipientName]   = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [settlement, setSettlement]         = useState('')
  const [branch, setBranch]                 = useState('')

  // ⬇️ нове: спосіб оплати ('cod' або 'bank')
  const [payment, setPayment] = useState('cod')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const total = useMemo(() => items.reduce((s, it) => {
    const price = Number(it.myPrice ?? it.product?.price_dropship ?? 0)
    return s + price * Number(it.qty || 1)
  }, 0), [items])

  const canSubmit = useMemo(() => {
    return items.length > 0 &&
      recipientName.trim().length >= 2 &&
      recipientPhone.trim().length >= 7 &&
      settlement.trim().length >= 2 &&
      branch.trim().length >= 1 &&
      (payment === 'cod' || payment === 'bank')
  }, [items, recipientName, recipientPhone, settlement, branch, payment])

  async function placeOrder() {
    if (!canSubmit) return
    setSubmitting(true); setError('')
    try {
      const { data: sdata } = await supabase.auth.getSession()
      const uid = sdata?.session?.user?.id
      if (!uid) throw new Error('Потрібно увійти в аккаунт')

      const { data: ono, error: onoErr } = await supabase.rpc('next_order_no')
      if (onoErr) throw onoErr

      const rows = items.map(it => ({
        user_id: uid,
        product_id: it.product.id,
        qty: Number(it.qty || 1),
        my_price: Number(it.myPrice ?? it.product.price_dropship ?? 0),
        recipient_name: recipientName.trim(),
        recipient_phone: recipientPhone.trim(),
        settlement: settlement.trim(),
        nova_poshta_branch: branch.trim(),
        status: 'pending',
        order_no: ono,
        payment_method: payment,   // ⬅️ пишемо обраний спосіб
      }))

      const { error: insErr } = await supabase.from('orders').insert(rows)
      if (insErr) throw insErr

      clearCart()
      nav('/dashboard')
    } catch (e) {
      setError(e.message || 'Помилка оформлення')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container-page my-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h1 className="h1">Кошик</h1>
        <Link className="btn-outline" to="/">До каталогу</Link>
      </div>

      {/* Товари */}
      <div className="card mb-4">
        <div className="card-body">
          {items.length === 0 ? (
            <div className="text-muted">Кошик порожній.</div>
          ) : (
            <div className="space-y-3">
              {items.map(it => (
                <div key={it.product.id} className="rounded-xl border border-slate-100 p-3 flex items-center gap-3">
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100">
                    {it.product.image_url && <img src={it.product.image_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{it.product.name}</div>
                    <div className="text-muted text-sm">Дроп-ціна: {(Number(it.product.price_dropship)||0).toFixed(2)} ₴</div>
                  </div>

                  <div className="flex items-center gap-2 w-[140px]">
                    <span className="text-sm text-muted">Кількість</span>
                    <input
                      type="number" min={1}
                      className="input input-xs w-[64px] text-center"
                      value={it.qty}
                      onChange={e=>setQty(it.product.id, Math.max(1, Number(e.target.value||1)))}
                    />
                  </div>

                  <div className="flex items-center gap-2 w-[210px]">
                    <span className="text-sm text-muted">Ціна продажу</span>
                    <input
                      type="number" min={0}
                      className="input input-xs w-[100px] text-right"
                      value={it.myPrice ?? it.product.price_dropship}
                      onChange={e=>setMyPrice(it.product.id, Number(e.target.value||0))}
                    />
                  </div>

                  <button className="btn-ghost" onClick={()=>removeItem(it.product.id)} title="Прибрати">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Разом */}
      <div className="card mb-4">
        <div className="card-body flex items-center justify-between">
          <div className="text-muted">Всього:</div>
          <div className="price text-[22px] font-semibold">{total.toFixed(2)} ₴</div>
        </div>
      </div>

      {/* Дані + Спосіб оплати */}
      <div className="card">
        <div className="card-body">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="h2 mb-3">Дані одержувача</div>

              <label className="label">ПІБ одержувача</label>
              <input className="input" value={recipientName} onChange={e=>setRecipientName(e.target.value)} />

              <label className="label mt-3">Телефон одержувача (+380...)</label>
              <input className="input" value={recipientPhone} onChange={e=>setRecipientPhone(e.target.value)} placeholder="+380..." />

              <label className="label mt-3">Населений пункт</label>
              <input className="input" value={settlement} onChange={e=>setSettlement(e.target.value)} />

              <label className="label mt-3">Відділення Нової пошти</label>
              <input className="input" value={branch} onChange={e=>setBranch(e.target.value)} placeholder="Напр.: 25" />
            </div>

            <div>
              <div className="h2 mb-3">Спосіб оплати</div>

              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio" className="accent-indigo-600"
                    name="payment" value="cod"
                    checked={payment === 'cod'}
                    onChange={()=>setPayment('cod')}
                  />
                  <div>
                    <div className="font-medium">Післяплата</div>
                    <div className="text-sm text-muted">Оплата при отриманні</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio" className="accent-indigo-600"
                    name="payment" value="bank"
                    checked={payment === 'bank'}
                    onChange={()=>setPayment('bank')}
                  />
                  <div>
                    <div className="font-medium">Оплата по реквізитам</div>
                    <div className="text-sm text-muted">Переказ на картку/рахунок до відправлення</div>
                  </div>
                </label>
              </div>

              <div className="mt-6">
                <button
                  className="btn-primary w-full md:w-auto"
                  onClick={placeOrder}
                  disabled={!canSubmit || submitting}
                >
                  {submitting ? 'Відправляємо…' : 'Підтвердити замовлення'}
                </button>
                {error && <div className="text-red-600 mt-2 text-sm">{error}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
