// src/pages/AdminOrders.jsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'

const STATUS_OPTIONS = [
  { v: 'pending',    t: 'Нове' },
  { v: 'processing', t: 'В обробці' },
  { v: 'ordered',    t: 'Замовлено' },
  { v: 'shipped',    t: 'Відправлено' },
  { v: 'delivered',  t: 'Доставлено' },
  { v: 'canceled',   t: 'Скасовано' },
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
        // тільки адміну доступно (RLS)
        const { data, error } = await supabase
          .from('orders')
          .select(`
            id, order_no, created_at, status, qty, my_price, ttn, payment_method,
            recipient_name, recipient_phone, settlement, nova_poshta_branch,
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

  // Групування по order_no
  const groups = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
      const key = r.order_no || r.id
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(r)
    }
    let list = Array.from(map.entries()).map(([order_no, lines]) => {
      const first = lines[0]
      const status = lines.every(l => l.status === first.status) ? first.status : 'processing'
      const payment = first?.payment_method || 'cod'
      const payout = payment === 'bank'
        ? 0
        : lines.reduce((s, r) => {
            const p = r.product || {}
            const unitSale = Number(r.my_price ?? p.price_dropship ?? 0)
            const unitDrop = Number(p.price_dropship ?? 0)
            return s + (unitSale - unitDrop) * Number(r.qty || 1)
          }, 0)
      // email того ж користувача (для всіх ліній однаковий)
      const email = first?.user?.email || ''
      const full_name = first?.user?.full_name || ''
      return {
        order_no,
        created_at: first?.created_at,
        ttn: first?.ttn || '',
        status,
        payment,
        payout,
        email,
        full_name,
        recipient_name: first?.recipient_name,
        recipient_phone: first?.recipient_phone,
        settlement: first?.settlement || '',
        branch: first?.nova_poshta_branch || '',
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

    // Сортування за email (опційно), інакше — за датою
    list.sort((a,b) => {
      if (q.startsWith('@') || q.includes('@')) {
        const cmp = (a.email||'').localeCompare(b.email||'')
        return sortByEmailAsc ? cmp : -cmp
      }
      return new Date(b.created_at) - new Date(a.created_at)
    })

    return list
  }, [rows, q, sortByEmailAsc])

  const totalPayout = useMemo(() => groups.reduce((s, g) => s + g.payout, 0), [groups])

  // Зміна статусу всіх рядків замовлення
  async function updateStatus(order_no, newStatus) {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('order_no', order_no)
    if (!error) setRows(prev => prev.map(r => r.order_no === order_no ? { ...r, status: newStatus } : r))
  }

  // Зміна ТТН (для всіх рядків order_no)
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

              {/* Лінії (товари) */}
              <div className="rounded-xl border border-slate-100">
                {g.lines.map((r, idx) => {
                  const p = r.product || {}
                  const unitSale = Number(r.my_price ?? p.price_dropship ?? 0)
                  const unitDrop = Number(p.price_dropship ?? 0)
                  const qty = Number(r.qty || 1)
                  const perLinePayout = g.payment === 'bank' ? 0 : (unitSale - unitDrop) * qty
                  return (
                    <div key={r.id} className={`p-3 flex flex-col sm:flex-row sm:items-center gap-3 ${idx>0 ? 'border-t border-slate-100':''}`}>
                      <div className="w-full sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-slate-100 sm:flex-none">
                        {p.image_url && <img src={p.image_url} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{p.name || '—'}</div>
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
            <span className="price text-[22px]">{totalPayout.toFixed(2)} ₴</span>
          </div>
        </div>
      )}
    </div>
  )
}
