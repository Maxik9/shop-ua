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

  // Оплата
  const [payment, setPayment] = useState('cod') // 'cod' (післяплата) або 'bank'
  const [comment, setComment] = useState('')

  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const phoneDigits = useMemo(() => (recipientPhone || '').replace(/\D/g, ''), [recipientPhone])

  const total = useMemo(() => {
    try {
      return safeItems.reduce((s, it) => {
        const price = Number(it?.myPrice ?? it?.product?.price_dropship ?? 0)
        const q = Number(it?.qty || 1)
        return s + price * q
      }, 0)
    } catch { return 0 }
  }, [safeItems])

  // ===== Валідація =====
  const lettersOnlyCore = (s) => {
    const core = (s || '').trim().replace(/\s+/g, ' ')
    return /^[А-Яа-яA-Za-zІіЇїЄєҐґ'’ -]+$/.test(core) ? core : null
  }
  const isValidName   = !!lettersOnlyCore(recipientName)
  const isValidPhone  = phoneDigits.length >= 9
  const isValidCity   = (settlement || '').trim().length >= 2
  const isValidBranch = /^\d{1,4}$/.test((branch || '').trim())
  const isValid = isValidName && isValidPhone && isValidCity && isValidBranch

  async function submit() {
    setSubmitted(true); setError('')
    if (!isValid || submitting) return
    try {
      setSubmitting(true)
      const { data: sess } = await supabase.auth.getSession()
      const uid = sess?.session?.user?.id || null

      // отримуємо наступний order_no (у тебе вже є RPC next_order_no)
      const { data: ono, error: seqErr } = await supabase.rpc('next_order_no')
      if (seqErr) throw seqErr

      const rows = safeItems.map(it => ({
        user_id: uid,
        product_id: it.product.id,
        qty: Number(it.qty || 1),
        my_price: Number(it.myPrice ?? it.product.price_dropship ?? 0),
        recipient_name: recipientName.trim(),
        recipient_phone: phoneDigits,
        settlement: settlement.trim(),
        nova_poshta_branch: branch.trim(),
        status: 'pending',
        order_no: ono,
        payment_method: payment,
        comment: (comment || '').trim(),
        // [SIZE] зберігаємо вибраний розмір
        size: it.product?.selected_size || null,
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

  // Клас підсвічування невалідних інпутів (після кліку)
  const invalidClass = (isValid) =>
    submitted && !isValid ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''

  const FieldError = ({ show, children }) =>
    submitted && show ? <div className="text-red-600 text-sm mt-1">{children}</div> : null

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <h1 className="h1">Кошик</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid lg:grid-cols-[2fr_1fr] gap-4">
        {/* Ліва колонка — список товарів */}
        <div className="card">
          <div className="card-body">
            <div className="space-y-3">
              {safeItems.map(it => {
                const pid = it.product.id
                const basePrice = Number(it.product?.price_dropship ?? 0)
                const curPrice  = Number(it.myPrice ?? basePrice)
                const qty       = Number(it.qty || 1)
                const dec = () => setQty(pid, Math.max(1, qty - 1))
                const inc = () => setQty(pid, qty + 1)
                return (
                  <div key={pid} className="relative rounded-xl bg-white border border-slate-200 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Фото (десктоп) */}
                    <div className="hidden sm:block w-20 h-20 rounded-lg overflow-hidden bg-slate-100 sm:flex-none">
                      {it.product?.image_url && (
                        <img src={it.product.image_url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pr-12 sm:pr-0">
                      <Link
                        to={`/product/${pid}`}
                        className="font-medium hover:text-indigo-600 truncate block"
                        title={it.product?.name}
                      >
                        {it.product?.name || 'Товар'}
                      </Link>
                      <div className="text-muted text-sm">Дроп-ціна: {basePrice.toFixed(2)} ₴{it.product?.selected_size ? <> • Розмір: <span className="font-medium">{it.product.selected_size}</span></> : null}</div>
                    </div>

                    {/* Десктоп: кількість */}
                    <div className="hidden sm:flex items-center gap-2 sm:w-[160px]">
                      <span className="text-sm text-muted">Кількість</span>
                      <input
                        type="number" min={1}
                        className="input input-xs w-[80px] text-center"
                        value={qty}
                        onChange={e => setQty(pid, Math.max(1, Number(e.target.value || 1)))}
                      />
                      <div className="flex flex-col">
                        <button className="btn-xs" onClick={inc}>+</button>
                        <button className="btn-xs" onClick={dec}>−</button>
                      </div>
                    </div>

                    {/* Ціна / видалити */}
                    <div className="sm:text-right">
                      <div className="font-semibold">{(curPrice * qty).toFixed(2)} ₴</div>
                      <div className="text-sm text-muted">({curPrice.toFixed(2)} ₴ × {qty})</div>
                      <div className="mt-2">
                        <button className="btn-outline btn-xs" onClick={() => removeItem(pid)}>Видалити</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Права колонка — оформлення */}
        <div className="space-y-4">
          <div className="card">
            <div className="card-body space-y-3">
              <div className="font-semibold">Отримувач</div>

              <label className="block">
                <div className="label">ПІБ</div>
                <input className={`input ${invalidClass(isValidName)}`} value={recipientName} onChange={e=>setRecipientName(e.target.value)} />
                <FieldError show={!isValidName}>Вкажіть коректне ПІБ</FieldError>
              </label>

              <label className="block">
                <div className="label">Телефон</div>
                <input className={`input ${invalidClass(isValidPhone)}`} value={recipientPhone} onChange={e=>setRecipientPhone(e.target.value)} />
                <FieldError show={!isValidPhone}>Вкажіть телефон</FieldError>
              </label>

              <label className="block">
                <div className="label">Населений пункт</div>
                <input className={`input ${invalidClass(isValidCity)}`} value={settlement} onChange={e=>setSettlement(e.target.value)} />
                <FieldError show={!isValidCity}>Вкажіть місто/село</FieldError>
              </label>

              <label className="block">
                <div className="label">Відділення НП</div>
                <input className={`input ${invalidClass(isValidBranch)}`} value={branch} onChange={e=>setBranch(e.target.value)} />
                <FieldError show={!isValidBranch}>Вкажіть № відділення</FieldError>
              </label>
            </div>
          </div>

          <div className="card">
            <div className="card-body space-y-3">
              <div className="font-semibold">Оплата</div>
              <select className="input" value={payment} onChange={e=>setPayment(e.target.value)}>
                <option value="cod">Післяплата</option>
                <option value="bank">Оплата по реквізитам</option>
              </select>

              <label className="block">
                <div className="label">Коментар</div>
                <textarea className="input min-h-[80px]" value={comment} onChange={e=>setComment(e.target.value)} />
              </label>

              <div className="text-right text-lg font-semibold">Разом: {total.toFixed(2)} ₴</div>
              <button className="btn-primary w-full" disabled={!isValid || submitting} onClick={submit}>
                {submitting ? 'Відправка…' : 'Підтвердити замовлення'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
