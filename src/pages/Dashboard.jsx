// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'

const STATUS_UA = {
  new: 'Нове',
  processing: 'В обробці',
  canceled: 'Скасовано',
  shipped: 'Відправлено',
  delivered: 'Отримано',
  refused: 'Відмова',
  paid: 'Виплачено',
}
const STATUS_FILTERS = [
  { v:'all',        t:'Всі статуси' },
  { v:'new',        t:'Нове' },
  { v:'processing', t:'В обробці' },
  { v:'canceled',   t:'Скасовано' },
  { v:'shipped',    t:'Відправлено' },
  { v:'delivered',  t:'Отримано' },
  { v:'refused',    t:'Відмова' },
  { v:'paid',       t:'Виплачено' },
]
const PAY_UA = { cod: 'Післяплата', bank: 'Оплата по реквізитам' }

function fmtDate(ts) {
  try {
    const d = new Date(ts)
    return d.toLocaleString('uk-UA', {
      year:'numeric', month:'2-digit', day:'2-digit',
      hour:'2-digit', minute:'2-digit'
    })
  } catch { return ts }
}

export default function Dashboard() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [totalTop, setTotalTop] = useState(0)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true); setError('')
      try {
        const { data: s } = await supabase.auth.getSession()
        const uid = s?.session?.user?.id
        if (!uid) throw new Error('Необхідна авторизація')

        // загальна сума до виплати (через RPC)
        try {
          const { data: total } = await supabase.rpc('get_total_payout', { p_user: uid })
          if (mounted) setTotalTop(Number(total || 0))
        } catch (_) {}

        const { data, error } = await supabase
          .from('orders')
          .select(`
            id, order_no, created_at, status, qty, my_price, ttn, payment_method,
            recipient_name, recipient_phone, settlement, nova_poshta_branch,
            comment, payout_override, size,
            product:products ( id, name, image_url, price_dropship )
          `)
          .eq('user_id', uid)
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

  // групування
  const grouped = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
      const key = r.order_no || r.id
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(r)
    }
    const list = Array.from(map.entries()).map(([order_no, lines]) => {
      const first = lines[0]
      const status  = lines.every(l => l.status === first.status) ? first.status : 'processing'
      const payment = first?.payment_method || 'cod'

      let baseSum = 0
      let hasAnyOverride = false
      for (const r of lines) {
        const p = r.product || {}
        const qty = Number(r.qty || 1)
        const unitSale = Number(r.my_price ?? p.price_dropship ?? 0)
        const unitDrop = Number(p.price_dropship ?? 0)

        const hasOverride = (r.payout_override !== null && r.payout_override !== undefined)
        let line = hasOverride ? Number(r.payout_override || 0)
                               : (unitSale - unitDrop) * qty
        if (!hasOverride && payment === 'bank') line = 0
        if (hasOverride) hasAnyOverride = true
        baseSum += line
      }

      let payout = 0
      if (status === 'delivered') payout = baseSum
      else if (status === 'refused' || status === 'canceled') payout = hasAnyOverride ? baseSum : 0
      else if (status === 'paid') payout = 0
      else payout = 0

      const display_total = baseSum

      return {
        order_no,
        created_at: first?.created_at,
        recipient_name: first?.recipient_name,
        recipient_phone: first?.recipient_phone,
        settlement: first?.settlement || '',
        branch: first?.nova_poshta_branch || '',
        ttn: first?.ttn || '',
        comment: first?.comment || '',
        status,
        payment,
        display_total,
        payout,
        lines,
      }
    }).sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
    return list
  }, [rows])

  // застосувати фільтри
  const filtered = useMemo(() => {
    let list = grouped
    if (statusFilter !== 'all') list = list.filter(g => g.status === statusFilter)
    const t = q.trim().toLowerCase()
    if (t) {
      list = list.filter(g =>
        (g.recipient_name || '').toLowerCase().includes(t) ||
        (g.recipient_phone || '').toLowerCase().includes(t)
      )
    }
    return list
  }, [grouped, statusFilter, q])

  const totalPayoutVisible = useMemo(
    () => filtered.reduce((s, g) => s + g.payout, 0),
    [filtered]
  )

  return (
    <div className="max-w-6xl mx-auto px-3 py-4 sm:py-6">
      {/* загальний підсумок зверху */}
      <div className="card mb-4">
        <div className="card-body flex items-center justify-between">
          <div className="font-medium">Разом до виплати</div>
          <div className="text-2xl font-bold">{totalTop.toFixed(2)} ₴</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
        <h1 className="h1">Мої замовлення</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="input input-xs w-[180px]"
            value={statusFilter}
            onChange={e=>setStatusFilter(e.target.value)}
          >
            {STATUS_FILTERS.map(o => <option key={o.v} value={o.v}>{o.t}</option>)}
          </select>
          <input
            className="input input-xs w-[260px] sm:w-[320px]"
            placeholder="Пошук: ПІБ або телефон одержувача…"
            value={q}
            onChange={e=>setQ(e.target.value)}
          />
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
      {!loading && !error && filtered.length === 0 && (
        <div className="card"><div className="card-body text-muted">Нічого не знайдено.</div></div>
      )}

      <div className="space-y-3">
        {filtered.map(order => (
          <div key={order.order_no} className="card">
            <div className="p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm text-muted">№</div>
                  <div className="text-[18px] font-semibold">{order.order_no}</div>
                  <div className="hidden sm:block text-muted">•</div>
                  <div className="text-sm text-muted">{fmtDate(order.created_at)}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-1 rounded-lg text-sm bg-slate-100 text-slate-700">
                    {STATUS_UA[order.status] ?? order.status}
                  </span>
                  <span className="px-2 py-1 rounded-lg text-sm bg-indigo-50 text-indigo-700">
                    Оплата: {PAY_UA[order.payment] || order.payment}
                  </span>
                  <span className="text-sm">
                    <span className="text-muted">ТТН:&nbsp;</span>
                    <span className="font-medium">{order.ttn || '—'}</span>
                  </span>
                </div>
              </div>

              <div className="mb-2 text-sm flex flex-col sm:flex-row sm:flex-wrap gap-y-1 gap-x-3">
                <div>
                  <span className="text-muted">Одержувач:&nbsp;</span>
                  <span className="font-medium">{order.recipient_name || '—'}</span>
                  <span className="text-muted">&nbsp;•&nbsp;</span>
                  <span className="font-medium">{order.recipient_phone || '—'}</span>
                </div>
                <div className="hidden sm:block text-muted">•</div>
                <div>
                  <span className="text-muted">Нас. пункт:&nbsp;</span>
                  <span className="font-medium">{order.settlement || '—'}</span>
                </div>
                <div className="hidden sm:block text-muted">•</div>
                <div>
                  <span className="text-muted">Відділення:&nbsp;</span>
                  <span className="font-medium">{order.branch || '—'}</span>
                </div>
              </div>

              {/* Коментар (для всього замовлення) */}
              {order.comment && (
                <div className="text-sm mb-2">
                  <span className="text-muted">Коментар:&nbsp;</span>
                  <span className="font-medium whitespace-pre-wrap">{order.comment}</span>
                </div>
              )}

              <div className="rounded-xl border border-slate-100">
                {order.lines.map((r, idx) => {
                  const p = r.product || {}
                  const unitSale = Number(r.my_price ?? p.price_dropship ?? 0)
                  const unitDrop = Number(p.price_dropship ?? 0)
                  const qty = Number(r.qty || 1)

                  const hasOverride = (r.payout_override !== null && r.payout_override !== undefined)
                  let lineBase = hasOverride ? Number(r.payout_override || 0)
                                             : (unitSale - unitDrop) * qty
                  if (!hasOverride && order.payment === 'bank') lineBase = 0

                  return (
                    <div key={r.id} className={`p-3 flex flex-col sm:flex-row sm:items-center gap-3 ${idx>0 ? 'border-t border-slate-100':''}`}>
                      <div className="hidden sm:block w-16 h-16 rounded-lg overflow-hidden bg-slate-100 sm:flex-none">
                        {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link to={`/product/${p.id}`} className="font-medium hover:text-indigo-600 truncate block" title={p.name}>
                          {p.name || '—'}
                        </Link>

                        {/* Розмір (якщо задано в orders.size) */}
                        {r.size && (
                          <div className="text-sm">Розмір: <span className="font-medium">{r.size}</span></div>
                        )}

                        <div className="text-muted text-sm">
                          К-ть: {qty} • Ціна/шт: {unitSale.toFixed(2)} ₴
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted">До виплати</div>
                        <div className="font-semibold">{lineBase.toFixed(2)} ₴</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-3 text-right">
                <span className="text-sm text-muted">Разом до виплати:&nbsp;</span>
                <span className="price text-[18px] font-semibold">{order.display_total.toFixed(2)} ₴</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length > 0 && (
        <div className="mt-4 text-right">
          <div className="text-[18px]">
            Всього до виплати по вибірці:&nbsp;
            <span className="price text-[22px]">{totalPayoutVisible.toFixed(2)} ₴</span>
          </div>
        </div>
      )}
    </div>
  )
}
