// src/pages/Cart.jsx
import { useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useCart } from '../context/CartContext'
import { Link, useNavigate } from 'react-router-dom'

export default function Cart() {
  const nav = useNavigate()
  const { items, removeItem, setQty, setMyPrice, clearCart } = useCart()

  const safeItems = useMemo(
    () => (Array.isArray(items) ? items.filter(it => it?.product?.id) : []),
    [items]
  )

  // Дані одержувача
  const [recipientName, setRecipientName]   = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [settlement, setSettlement]         = useState('')
  const [branch, setBranch]                 = useState('')

  // Спосіб оплати: 'cod' — післяплата, 'bank' — по реквізитам
  const [payment, setPayment] = useState('cod')

  // Нове: Коментар
  const [comment, setComment] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const total = useMemo(() => {
    try {
      return safeItems.reduce((s, it) => {
        const price = Number(it?.myPrice ?? it?.product?.price_dropship ?? 0)
        const q = Number(it?.qty || 1)
        return s + price * q
      }, 0)
    } catch { return 0 }
  }, [safeItems])

  const canSubmit = useMemo(() =>
    safeItems.length > 0 &&
    recipientName.trim().length >= 2 &&
    recipientPhone.trim().length >= 7 &&
    settlement.trim().length >= 2 &&
    branch.trim().length >= 1 &&
    (payment === 'cod' || payment === 'bank')
  , [safeItems, recipientName, recipientPhone, settlement, branch, payment])

  async function placeOrder() {
    if (!canSubmit) return
    setSubmitting(true); setError('')
    try {
      const { data: sdata } = await supabase.auth.getSession()
      const uid = sdata?.session?.user?.id
      if (!uid) throw new Error('Потрібно увійти в аккаунт')

      // Отримуємо номер замовлення (один для всіх рядків чеку)
      const { data: ono, error: onoErr } = await supabase.rpc('next_order_no')
      if (onoErr) throw onoErr

      const rows = safeItems.map(it => ({
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
        payment_method: payment,
        comment: comment.trim(), // ← додали
      }))

      const { error: insErr } = await supabase.from('orders').insert(rows)
      if (insErr) throw insErr

      clearCart()
      nav('/dashboard') // після оформлення → у «Мої замовлення»
    } catch (e) {
      setError(e.message || 'Помилка оформлення')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-3 py-4 sm:py-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h1 className="h1">Кошик</h1>
        <Link className="btn-outline" to="/">До каталогу</Link>
      </div>

      {/* Товари */}
      <div className="card mb-4">
        <div className="card-body">
          {safeItems.length === 0 ? (
            <div className="text-muted">Кошик порожній.</div>
          ) : (
            <div className="space-y-3">
              {safeItems.map(it => {
                const pid = it.product.id
                const basePrice = Number(it.product?.price_dropship ?? 0)
                const curPrice  = Number(it.myPrice ?? basePrice)
                const qty       = Number(it.qty || 1)
                return (
                  <div key={pid} className="rounded-xl border border-slate-100 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="w-full sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-slate-100 sm:flex-none">
                      {it.product?.image_url && (
                        <img src={it.product.image_url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{it.product?.name || 'Товар'}</div>
                      <div className="text-muted text-sm">Дроп-ціна: {basePrice.toFixed(2)} ₴</div>
                    </div>

                    <div className="flex items-center gap-2 sm:w-[140px]">
                      <span className="text-sm text-muted">Кількість</span>
                      <input
                        type="number" min={1}
                        className="input input-xs w-[80px] text-center"
                        value={qty}
                        onChange={e => setQty(pid, Math.max(1, Number(e.target.value || 1)))}
                      />
                    </div>

                    <div className="flex items-center gap-2 sm:w-[220px]">
                      <span className="text-sm text-muted">Ціна продажу</span>
                      <input
                        type="number" min={0}
                        className="input input-xs w-[120px] text-right"
                        value={curPrice}
                        onChange={e => setMyPrice(pid, Number(e.target.value || 0))}
                      />
                    </div>

                    <button className="btn-ghost self-end sm:self-auto" onClick={() => removeItem(pid)} title="Прибрати">×</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Разом */}
      <div className="card mb-4">
        <div className="card-body flex items-center justify-between">
          <div className="text-muted">Всього:</div>
          <div className="price text-[20px] sm:text-[22px] font-semibold">{total.toFixed(2)} ₴</div>
        </div>
      </div>

      {/* Дані + Спосіб оплати + Коментар */}
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

              {/* Коментар */}
              <label className="label mt-3">Коментар до замовлення (необовʼязково)</label>
              <textarea
                className="input"
                rows="3"
                placeholder="Напр.: Колір чорний. Бажано відправити завтра."
                value={comment}
                onChange={(e)=>setComment(e.target.value)}
              />
            </div>

            <div>
              <div className="h2 mb-3">Спосіб оплати</div>

              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" className="accent-indigo-600" name="payment" value="cod"
                         checked={payment === 'cod'} onChange={()=>setPayment('cod')} />
                  <div>
                    <div className="font-medium">Післяплата</div>
                    <div className="text-sm text-muted">Оплата при отриманні</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" className="accent-indigo-600" name="payment" value="bank"
                         checked={payment === 'bank'} onChange={()=>setPayment('bank')} />
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
