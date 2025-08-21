// src/pages/AdminOrders.jsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'

const STATUS_OPTIONS = [
  { v: 'new',        t: 'Нове' },
  { v: 'processing', t: 'В обробці' },
  { v: 'canceled',   t: 'Скасовано' },
  { v: 'shipped',    t: 'Відправлено' },
  { v: 'delivered',  t: 'Отримано' },
  { v: 'refused',    t: 'Відмова' },
  { v: 'paid',       t: 'Виплачено' },
]
const STATUS_UA = Object.fromEntries(STATUS_OPTIONS.map(o => [o.v, o.t]))
const PAY_UA = { cod: 'Післяплата', bank: 'Оплата по реквізитам' }

function fmtDate(ts) {
  try {
    const d = new Date(ts)
    return d.toLocaleString('uk-UA', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })
  } catch { return ts }
}

export default function AdminOrders() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [sortByEmailAsc, setSortByEmailAsc] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true); setError('')
      try {
        // Завантажуємо лінії замовлень + потрібні поля для обчислень
        const { data, error } = await supabase
          .from('orders')
          .select(`
            id, order_no, created_at, status, qty, my_price, ttn, payment_method,
            recipient_name, recipient_phone, settlement, nova_poshta_branch,
            comment,
            payout_override,       -- ДОПОВНЕНО: ручна сума по рядку
            product:products ( id, name, image_url, price_dropship ),
            user:profiles ( user_id, email, full_name )
          `)
          .order('created_at', { ascending: false })

        if (error) throw error
        if (mounted) setRows(data || [])
      } catch (e) {
        if (mounted) setError(e.message || 'Помилка завантаження')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  // Групування по order_no з логікою виплат
  const groups = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
      const key = r.order_no || r.id
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(r)
    }

    let list = Array.from(map.entries()).map(([order_no, lines]) => {
      const first = lines[0]
      // якщо статуси різні — показуємо «В обробці» як агрегований стан
      const status = lines.every(l => l.status === first.status) ? first.status : 'processing'
      const payment = first?.payment_method || 'cod'

      // базова сума виплати по замовленню (без урахування статусу):
      // - якщо payment === 'bank' → 0
      // - інакше: сумуємо по рядках:
      //     якщо payout_override заданий → беремо його (вважаємо, що це сума за рядок)
      //     інакше (my_price - price_dropship) * qty
      let baseSum = 0
      let hasAnyOverride = false
      for (const r of lines) {
        const p = r.product || {}
        const qty = Number(r.qty || 1)
        const unitSale = Number(r.my_price ?? p.price_dropship ?? 0)
        const unitDrop = Number(p.price_dropship ?? 0)
        let line = 0
        if (r.payout_override !== null && r.payout_override !== undefined) {
          hasAnyOverride = true
          line = Number(r.payout_override || 0)
        } else {
          line = (unitSale - unitDrop) * qty
        }
        baseSum += line
      }
      // враховуємо спосіб оплати
      if (payment === 'bank') baseSum = 0

      // тепер застосовуємо бізнес-правило по статусу:
      // delivered → беремо baseSum
      // refused   → якщо є override на будь-якому рядку — беремо baseSum (може бути від’ємним), інакше 0
      // canceled  → якщо є override → baseSum, інакше 0
      // paid      → Нуль до загальної суми (внизу ми ще раз відфільтруємо), але для відображення можна показати baseSum
      // new/processing/shipped → 0
      let payout = 0
      if (status === 'delivered') {
        payout = baseSum
      } else if (status === 'refused' || status === 'canceled') {
        payout = hasAnyOverride ? baseSum : 0
      } else if (status === 'paid') {
        payout = baseSum // відобразимо як довідкове, але нижче не додамо у загальний підсумок
      } else {
        payout = 0
      }

      const email = first?.user?.email || ''
      const full_name = first?.user?.full_name || ''
      const comment = first?.comment || ''

      return {
        order_no,
        created_at: first?.created_at,
        ttn: first?.ttn || '',
        status,
        payment,
        payout,                 // Разом до виплати по замовленню (з урахуванням правил)
        email,
        full_name,
        recipient_name: first?.recipient_name,
        recipient_phone: first?.recipient_phone,
        settlement: first?.settlement || '',
        branch: first?.nova_poshta_branch || '',
        comment,
        lines,
      }
    })

    // Пошук
    const t = q.trim().toLowerCase()
    if (t) {
      list = list.filter(g =>
        (String(g.order_no) || '').toLowerCase().includes(t) ||
        (g.email || '').toLowerCase().includes(t) ||
        (g.full_name || '').toLowerCase().includes(t) ||
        (g.recipient_name || '').toLowerCase().includes(t) ||
        (g.recipient_phone || '').toLowerCase().includes(t)
      )
    }

    // Сортування за email (коли шукаємо по email), інакше — за датою
    list.sort((a,b) => {
      if (q.includes('@')) {
        const cmp = (a.email||'').localeCompare((b.email||''))
        return sortByEmailAsc ? cmp : -cmp
      }
      return new Date(b.created_at) - new Date(a.created_at)
    })

    return list
  }, [rows, q, sortByEmailAsc])

  // Загальна сума до виплати по вибірці
  const totalPayout = useMemo(() =>
    groups.reduce((s, g) => s + (g.status === 'paid' ? 0 : g.payout), 0),
  [groups])

  // Масова зміна статусу для order_no
  async function updateStatus(order_no, newStatus) {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('order_no', order_no)
    if (!error) setRows(prev => prev.map(r => r.order_no === order_no ? { ...r, status: newStatus } : r))
  }

  // Масова зміна ТТН для order_no
  async function updateTTN(order_no, newTTN) {
    const { error } = await supabase.from('orders').update({ ttn: newTTN }).eq('order_no', order_no)
    if (!error) setRows(prev => prev.map(r => r.order_no === order_no ? { ...r, ttn: newTTN } : r))
  }

  return (
    <div className="max-w-6xl mx-auto px-3 py-4 sm:py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <h1 className="h1">Замовлення (адмін)</h1>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input input-xs w-[260px] sm:w-[320px]"
            placeholder="Пошук: email, ПІБ, телефон або №…"
            value={q}
            onChange={e=>setQ(e.target.value)}
          />
          <button
            className="btn-outline"
            onClick={() => setSortByEmailAsc(v => !v)}
            title="Сортувати за email (коли фільтр — email)"
          >
            {sortByEmailAsc ? 'Email ↑' : 'Email ↓'}
          </button>
          <Link to="/" className="btn-outline">До каталогу</Link>
        </div>
      </div>

      {loading && <div className="card"><div className="card-body">Завантаження…</div></div>}
      {error && (
        <div className="card mb-4"><div className="card-body">
          <div className="h2 mb-2">Помилка</div>
          <div className="text-muted">{error}</div>
        </div></div>
      )}
      {!loading && !error && groups.length === 0 && (
        <div className="card"><div className="card-body text-muted">Нічого не знайдено.</div></div>
      )}

      <div className="space-y-3">
        {groups.map(g => (
          <div key={g.order_no} className="card">
            <div className="p-4 space-y-3">
              {/* Шапка замовлення */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm text-muted">№</div>
                  <div className="text-[18px] font-semibold">{g.order_no}</div>
                  <div className="hidden sm:block text-muted">•</div>
                  <div className="text-sm text-muted">{fmtDate(g.created_at)}</div>
                  <div className="hidden sm:block text-muted">•</div>
                  <div className="text-sm">
                    <span className="text-muted">Email:&nbsp;</span>
                    <span className="font-medium">{g.email || '—'}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Статус */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted">Статус:</span>
                    <select
                      className="input input-xs w-[200px]"
                      value={g.status}
                      onChange={e=>updateStatus(g.order_no, e.target.value)}
                    >
                      {STATUS_OPTIONS.map(o => (
                        <option key={o.v} value={o.v}>{o.t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Оплата */}
                  <span className="px-2 py-1 rounded-lg text-sm bg-indigo-50 text-indigo-700">
                    {PAY_UA[g.payment] || g.payment}
                  </span>

                  {/* ТТН */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted">ТТН:</span>
                    <input
                      className="input input-xs w-[200px]"
                      defaultValue={g.ttn}
                      onBlur={e => updateTTN(g.order_no, e.target.value.trim())}
                      placeholder="Введіть номер…"
                    />
                  </div>
                </div>
              </div>

              {/* Одержувач/адреса */}
              <div className="text-sm flex flex-col md:flex-row md:flex-wrap gap-y-1 gap-x-3">
                <div>
                  <span className="text-muted">Одержувач:&nbsp;</span>
                  <span className="font-medium">{g.recipient_name || '—'}</span>
                  <span className="text-muted">&nbsp;•&nbsp;</span>
                  <span className="font-medium">{g.recipient_phone || '—'}</span>
                </div>
                <div className="hidden md:block text-muted">•</div>
                <div>
                  <span className="text-muted">Нас. пункт:&nbsp;</span>
                  <span className="font-medium">{g.settlement || '—'}</span>
                </div>
                <div className="hidden md:block text-muted">•</div>
                <div>
                  <span className="text-muted">Відділення:&nbsp;</span>
                  <span className="font-medium">{g.branch || '—'}</span>
                </div>
              </div>

              {/* Коментар (якщо є) */}
              {g.comment && (
                <div className="text-sm">
                  <span className="text-muted">Коментар:&nbsp;</span>
                  <span className="font-medium whitespace-pre-wrap">{g.comment}</span>
                </div>
              )}

              {/* Лінії (товари) */}
              <div className="rounded-xl border border-slate-100">
                {g.lines.map((r, idx) => {
                  const p = r.product || {}
                  const qty = Number(r.qty || 1)
                  const unitSale = Number(r.my_price ?? p.price_dropship ?? 0)
                  const unitDrop = Number(p.price_dropship ?? 0)

                  // базова виплата по рядку (без статусу і способу оплати)
                  let lineBase = 0
                  if (r.payout_override !== null && r.payout_override !== undefined) {
                    lineBase = Number(r.payout_override || 0)
                  } else {
                    lineBase = (unitSale - unitDrop) * qty
                  }

                  // якщо оплата "bank" — по твоїй старій логіці виплата 0
                  if (g.payment === 'bank') lineBase = 0

                  // показуємо «До виплати» по рядку згідно статусу замовлення
                  let perLinePayout = 0
                  if (g.status === 'delivered') {
                    perLinePayout = lineBase
                  } else if (g.status === 'refused' || g.status === 'canceled') {
                    perLinePayout = (r.payout_override !== null && r.payout_override !== undefined) ? lineBase : 0
                  } else if (g.status === 'paid') {
                    perLinePayout = lineBase // довідково
                  } else {
                    perLinePayout = 0
                  }

                  return (
                    <div key={r.id} className={`p-3 flex flex-col sm:flex-row sm:items-center gap-3 ${idx>0 ? 'border-t border-slate-100':''}`}>
                      <div className="hidden sm:block w-16 h-16 rounded-lg overflow-hidden bg-slate-100 sm:flex-none">
                        {p.image_url && <img src={p.image_url} className="w-full h-full object-cover" alt="" />}
                      </div>
                      <div className="flex-1 min-w-0 max-w-full">
                        <Link to={`/product/${p.id}`} className="font-medium hover:text-indigo-600 break-words whitespace-normal leading-snug">{p.name || '—'}</Link>
                        <div className="text-muted text-sm">К-ть: {qty} • Ціна/шт: {unitSale.toFixed(2)} ₴</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted">До виплати</div>
                        <div className="font-semibold">{perLinePayout.toFixed(2)} ₴</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Разом по замовленню */}
              <div className="mt-3 text-right">
                <span className="text-sm text-muted">Разом до виплати:&nbsp;</span>
                <span className="price text-[18px] font-semibold">{g.payout.toFixed(2)} ₴</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {groups.length > 0 && (
        <div className="mt-4 text-right">
          <div className="text-[18px]">
            Всього до виплати по вибірці:&nbsp;
            <span className="price text-[22px]">
              {totalPayout.toFixed(2)} ₴
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
