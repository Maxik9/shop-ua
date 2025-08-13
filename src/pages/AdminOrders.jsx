// src/pages/AdminOrders.jsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

const STATUS = [
  { v: 'pending',     t: 'Очікує' },
  { v: 'processing',  t: 'В обробці' },
  { v: 'ordered',     t: 'Замовлено' },
  { v: 'shipped',     t: 'Відправлено' },
  { v: 'delivered',   t: 'Доставлено' },
  { v: 'canceled',    t: 'Скасовано' },
]

function fmtDate(ts) {
  try {
    const d = new Date(ts)
    return d.toLocaleString('uk-UA', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  } catch { return ts }
}

export default function AdminOrders() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [q, setQ] = useState('')
  const [sortEmail, setSortEmail] = useState('none') // 'asc' | 'desc' | 'none'

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, order_no, created_at, status, qty, my_price, ttn,
        recipient_name, recipient_phone, settlement, nova_poshta_branch,
        product:products ( id, name, image_url, price_dropship ),
        user:profiles ( user_id, full_name, phone, email )
      `)
      .order('created_at', { ascending: false })
    if (!error) setRows(data || [])
    setLoading(false)
  }

  // Групування по order_no (одна картка на замовлення)
  const orders = useMemo(() => {
    const acc = new Map()
    for (const r of rows) {
      const key = r.order_no || r.id
      if (!acc.has(key)) acc.set(key, [])
      acc.get(key).push(r)
    }
    const list = Array.from(acc.entries()).map(([order_no, lines]) => {
      const first = lines[0]
      const status = lines.every(l => l.status === first.status) ? first.status : 'processing'
      const sum = lines.reduce((s, r) => {
        const p = r.product || {}
        const unit = Number(r.my_price ?? p.price_dropship ?? 0)
        return s + unit * Number(r.qty || 1)
      }, 0)
      const payout = lines.reduce((s, r) => {
        const p = r.product || {}
        const unitSale = Number(r.my_price ?? p.price_dropship ?? 0)
        const unitDrop = Number(p.price_dropship ?? 0)
        return s + (unitSale - unitDrop) * Number(r.qty || 1)
      }, 0)
      return {
        order_no,
        lines,
        created_at: first?.created_at,
        status,
        ttn: first?.ttn || '',
        user: first?.user || null, // профіль дропшипера
        recipient_name: first?.recipient_name,
        recipient_phone: first?.recipient_phone,
        settlement: first?.settlement,
        branch: first?.nova_poshta_branch,
        sum,
        payout
      }
    })
    // за замовчуванням — новіші зверху
    return list.sort((a,b)=> new Date(b.created_at) - new Date(a.created_at))
  }, [rows])

  // Фільтр/пошук/сортування
  const list = useMemo(() => {
    let arr = orders
    if (statusFilter !== 'all') arr = arr.filter(o => o.status === statusFilter)

    const t = q.trim().toLowerCase()
    if (t) {
      arr = arr.filter(o => {
        const products = o.lines.map(l => l.product?.name).filter(Boolean).join(' ')
        const candidate = [
          String(o.order_no),
          o.user?.full_name, o.user?.phone, o.user?.email,
          o.recipient_name, o.recipient_phone,
          products, o.ttn, o.settlement, o.branch,
          o.status, fmtDate(o.created_at)
        ].filter(Boolean).join(' ').toLowerCase()
        return candidate.includes(t)
      })
    }

    if (sortEmail !== 'none') {
      arr = [...arr].sort((a,b) => {
        const A = (a.user?.email || '').toLowerCase()
        const B = (b.user?.email || '').toLowerCase()
        if (A === B) return 0
        if (sortEmail === 'asc')  return A < B ? -1 : 1
        if (sortEmail === 'desc') return A > B ? -1 : 1
        return 0
      })
    }
    return arr
  }, [orders, statusFilter, q, sortEmail])

  async function updateStatus(order_no, status) {
    const prev = rows
    setRows(s => s.map(r => r.order_no === order_no ? { ...r, status } : r))
    const { error } = await supabase.from('orders').update({ status }).eq('order_no', order_no)
    if (error) { alert(error.message); setRows(prev) }
  }

  async function updateTTN(order_no, ttn) {
    const prev = rows
    setRows(s => s.map(r => r.order_no === order_no ? { ...r, ttn } : r))
    const { error } = await supabase.from('orders').update({ ttn }).eq('order_no', order_no)
    if (error) { alert(error.message); setRows(prev) }
  }

  return (
    <div className="container-page my-6">
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h1 className="h1">Адмін • Замовлення</h1>
            <div className="flex gap-2">
              <button className="btn-outline" onClick={load} disabled={loading}>Оновити</button>
            </div>
          </div>

          {/* Фільтри/пошук/сортування */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select
              className="input input-xs w-[200px]"
              value={statusFilter}
              onChange={e=>setStatusFilter(e.target.value)}
            >
              <option value="all">Всі статуси</option>
              {STATUS.map(s => <option key={s.v} value={s.v}>{s.t}</option>)}
            </select>

            <input
              className="input input-xs w-[320px]"
              placeholder="Пошук: №, email, клієнт, одержувач, товар, ТТН…"
              value={q}
              onChange={e=>setQ(e.target.value)}
            />

            <select
              className="input input-xs w-[210px]"
              value={sortEmail}
              onChange={e=>setSortEmail(e.target.value)}
              title="Сортування за email дропшипера"
            >
              <option value="none">Без сортування email</option>
              <option value="asc">Email A → Z</option>
              <option value="desc">Email Z → A</option>
            </select>

            <div className="ml-auto text-muted text-sm">{list.length} замовлень</div>
          </div>

          {/* Замовлення */}
          <div className="space-y-4">
            {list.map(o => (
              <div key={o.order_no} className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                {/* Шапка */}
                <div className="p-4 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
                  <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-muted">№</div>
                      <div className="font-semibold">{o.order_no}</div>
                    </div>
                    <div className="text-sm text-muted">{fmtDate(o.created_at)}</div>

                    <div className="text-sm">
                      <span className="text-muted">Клієнт:&nbsp;</span>
                      <span className="font-medium">{o.user?.full_name || '—'}</span>
                      <span className="text-muted">&nbsp;•&nbsp;</span>
                      <span className="font-medium">{o.user?.phone || '—'}</span>
                      <span className="text-muted">&nbsp;•&nbsp;</span>
                      <span className="font-medium">{o.user?.email || '—'}</span>
                    </div>

                    <div className="text-sm">
                      <span className="text-muted">Одержувач:&nbsp;</span>
                      <span className="font-medium">{o.recipient_name}</span>
                      <span className="text-muted">&nbsp;•&nbsp;</span>
                      <span className="font-medium">{o.recipient_phone}</span>
                    </div>

                    <div className="text-sm text-muted">
                      {o.settlement} • Відділення: {o.branch}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      className="input input-xs"
                      value={o.status}
                      onChange={e=>updateStatus(o.order_no, e.target.value)}
                    >
                      {STATUS.map(s => <option key={s.v} value={s.v}>{s.t}</option>)}
                    </select>
                    <input
                      className="input input-xs w-[220px]"
                      value={o.ttn}
                      onChange={e=>updateTTN(o.order_no, e.target.value)}
                      placeholder="ТТН (одна на замовлення)"
                    />
                  </div>
                </div>

                {/* Товари */}
                <div>
                  {o.lines.map((r, idx) => {
                    const p = r.product || {}
                    const unit = Number(r.my_price ?? p.price_dropship ?? 0)
                    const qty  = Number(r.qty || 1)
                    const payout = (Number(r.my_price ?? p.price_dropship ?? 0) - Number(p.price_dropship ?? 0)) * qty
                    return (
                      <div key={r.id} className={`p-4 flex items-center gap-4 ${idx>0 ? 'border-t border-slate-100':''}`}>
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100">
                          {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{p.name || '—'}</div>
                          <div className="text-muted text-sm">x{qty}</div>
                        </div>
                        <div className="text-right w-[140px]">
                          <div className="text-sm text-muted">Сума</div>
                          <div className="font-semibold">{(unit*qty).toFixed(2)} ₴</div>
                        </div>
                        <div className="text-right w-[180px]">
                          <div className="text-sm text-muted">До виплати</div>
                          <div className="font-semibold">{payout.toFixed(2)} ₴</div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Підсумок */}
                <div className="px-4 py-3 text-right bg-slate-50 border-t border-slate-200">
                  <div className="flex flex-wrap items-center justify-end gap-6">
                    <div>
                      <span className="text-sm text-muted">Сума замовлення:&nbsp;</span>
                      <span className="price text-[18px] font-semibold">{o.sum.toFixed(2)} ₴</span>
                    </div>
                    <div>
                      <span className="text-sm text-muted">До виплати дропшиперу:&nbsp;</span>
                      <span className="price text-[18px] font-semibold">{o.payout.toFixed(2)} ₴</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {list.length === 0 && (
              <div className="card"><div className="card-body text-center text-muted">Нічого немає</div></div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
