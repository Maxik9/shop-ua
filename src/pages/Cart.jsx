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
  const [payment, setPayment] = useState('cod') // 'cod' (післяплата) | 'bank'

  // Коментар (необовʼязковий)
  const [comment, setComment] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false) // показувати помилки після натискання кнопки

  // Нормалізований телефон — тільки цифри
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
    const core = (s || '').trim()
    if (!core) return ''
    // дозволяємо пробіли/дефіси/апострофи, видаляємо їх для перевірки
    return core.replace(/[ '\-’]/g, '')
  }
  const isLetters = (s) => /^[A-Za-zА-Яа-яЁёІіЇїЄєҐґ]+$/.test(lettersOnlyCore(s))
  const isDigits  = (s) => /^\d+$/.test((s || '').trim())

  const validName       = recipientName.trim().length > 0 && isLetters(recipientName)
  const validPhone      = phoneDigits.length >= 10 && isDigits(phoneDigits)
  const validSettlement = settlement.trim().length > 0 && isLetters(settlement)
  const validBranch     = branch.trim().length > 0 && isDigits(branch)

  const canSubmit = useMemo(() => {
    return safeItems.length > 0 &&
      validName && validPhone && validSettlement && validBranch &&
      (payment === 'cod' || payment === 'bank')
  }, [safeItems.length, validName, validPhone, validSettlement, validBranch, payment])

  async function placeOrder() {
    setSubmitted(true)
    setError('')
    if (!canSubmit) {
      // показ інлайнових помилок вже активований через submitted=true
      return
    }

    setSubmitting(true)
    try {
      const { data: sdata } = await supabase.auth.getSession()
      const uid = sdata?.session?.user?.id
      if (!uid) throw new Error('Потрібно увійти в аккаунт')

      // Номер замовлення (RPC або timestamp-фолбек)
      let ono = null
      try {
        const { data: d, error: e } = await supabase.rpc('next_order_no')
        if (e) throw e
        ono = d
      } catch {
        ono = Math.floor(Date.now() / 1000)
      }

      const rows = safeItems.map(it => {
        const pid = it.product.id
        const selSize = it.size ?? it.product?._selectedSize ?? null
        return {
          user_id: uid,
          product_id: pid,
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
          size: selSize, // ДОДАНО
        }
      })

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
                const dec = () => setQty(pid, Math.max(1, qty - 1))
                const inc = () => setQty(pid, qty + 1)
                const selSize = it.size ?? it.product?._selectedSize
                return (
                  <div key={pid} className="relative rounded-xl border border-slate-100 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
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
                      <div className="text-muted text-sm">
                        Дроп-ціна: {basePrice.toFixed(2)} ₴
                        {selSize ? <> • Розмір: <span className="font-medium">{selSize}</span></> : null}
                      </div>
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
                    </div>

                    {/* Десктоп: ціна продажу */}
                    <div className="hidden sm:flex items-center gap-2 sm:w-[240px]">
                      <span className="text-sm text-muted whitespace-nowrap">Ціна продажу</span>
                      <input
                        type="number" min={0}
                        className="input input-xs w-[120px] text-right"
                        value={curPrice}
                        onChange={e => setMyPrice(pid, Number(e.target.value || 0))}
                      />
                    </div>

                    {/* Видалити товар */}
                    <button
                      className="sm:hidden absolute top-3 right-3 w-6 h-6 rounded-full border border-red-500 text-red-500 hover:bg-red-50 active:scale-95 transition"
                      onClick={() => removeItem(pid)}
                      title="Прибрати"
                      aria-label="Прибрати"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>

                    <button
                      className="hidden sm:inline-flex items-center justify-center w-7 h-7 rounded-full border border-red-500 text-red-500 hover:bg-red-50"
                      onClick={() => removeItem(pid)}
                      title="Прибрати"
                      aria-label="Прибрати"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>

                    {/* Мобілка: кількість + ціна продажу */}
                    <div className="sm:hidden w-full space-y-3 mt-1">
                      <div>
                        <div className="text-sm text-muted mb-1">Кількість</div>
                        <div className="grid grid-cols-[48px_1fr_48px] gap-2">
                          <button onClick={dec} type="button" className="btn-outline h-11 rounded-xl text-lg">−</button>
                          <input
                            type="number" min={1}
                            className="input h-11 text-center"
                            value={qty}
                            onChange={e => setQty(pid, Math.max(1, Number(e.target.value || 1)))}
                          />
                          <button onClick={inc} type="button" className="btn-outline h-11 rounded-xl text-lg">+</button>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-muted mb-1">Ціна продажу</div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₴</span>
                          <input
                            type="number" min={0}
                            className="input pl-7 text-right"
                            value={curPrice}
                            onChange={e => setMyPrice(pid, Number(e.target.value || 0))}
                          />
                        </div>
                      </div>
                    </div>
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

      {/* Дані + Оплата + Коментар */}
      <div className="card">
        <div className="card-body">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="h2 mb-3">Дані одержувача</div>

              <label className="label">ПІБ одержувача</label>
              <input
                className={`input ${invalidClass(validName)}`}
                value={recipientName}
                onChange={e=>setRecipientName(e.target.value)}
              />
              <FieldError show={!validName}>Поле повинно містити лише літери.</FieldError>

              <label className="label mt-3">Телефон одержувача (+380...)</label>
              <input
                type="tel"
                className={`input ${invalidClass(validPhone)}`}
                value={recipientPhone}
                onChange={e=>setRecipientPhone(e.target.value)}
                placeholder="+380..."
              />
              <FieldError show={!validPhone}>Введіть щонайменше 10 цифр (лише цифри).</FieldError>

              <label className="label mt-3">Населений пункт</label>
              <input
                className={`input ${invalidClass(validSettlement)}`}
                value={settlement}
                onChange={e=>setSettlement(e.target.value)}
              />
              <FieldError show={!validSettlement}>Поле повинно містити лише літери.</FieldError>

              <label className="label mt-3">Відділення Нової пошти</label>
              <input
                className={`input ${invalidClass(validBranch)}`}
                value={branch}
                onChange={e=>setBranch(e.target.value)}
                placeholder="Напр.: 25"
              />
              <FieldError show={!validBranch}>Введіть номер відділення (лише цифри).</FieldError>

              <label className="label mt-3">Коментар до замовлення (необовʼязково)</label>
              <textarea
                className="input"
                rows="3"
                placeholder="Будь-які уточнення по замовленню"
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
                  disabled={submitting || safeItems.length === 0}
                  aria-disabled={submitting || safeItems.length === 0}
                >
                  {submitting ? 'Відправляємо…' : 'Підтвердити замовлення'}
                </button>

                {/* Загальна помилка від сервера */}
                {error && <div className="text-red-600 mt-2 text-sm">{error}</div>}
                {/* Загальне попередження (одне, без дублювань) */}
                {submitted && !canSubmit && !error && (
                  <div className="text-red-600 mt-2 text-sm" aria-live="polite">
                    Заповніть, будь ласка, поля
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
