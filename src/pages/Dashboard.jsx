// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'

const STATUS_UA = {
  pending: 'Нове',
  processing: 'В обробці',
  ordered: 'Замовлено у постачальника',
  shipped: 'Відправлено',
  delivered: 'Доставлено',
  canceled: 'Скасовано',
}

const PAY_UA = {
  cod: 'Післяплата',
  bank: 'Оплата по реквізитам',
}

function fmtDate(ts) {
  try {
    const d = new Date(ts)
    return d.toLocaleString('uk-UA', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  } catch { return ts }
}

export default function Dashboard() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true); setError('')
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const uid = sessionData?.session?.user?.id
        if (!uid) throw new Error('Необхідна авторизація')

        const { data, error } = await supabase
          .from('orders')
          .select(`
            id, order_no, created_at, status, qty, my_price, ttn, payment_method,
            recipient_name, recipient_phone,
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

  // Групування по order_no (одна картка на замовлення)
  const grouped = useMemo(() => {
    const acc = new Map()
    for (const r of rows) {
      const key = r.order_no || r.id
      if (!acc.has(key)) acc.set(key, [])
      acc.get(key).push(r)
    }
    return Array.from(acc.entries())
      .map(([order_no, lines]) => {
        const first = lines[0]
        const status = lines.every(l => l.status === first.status) ? first.status : 'processing'
        const payment = first?.payment_method || 'cod'
        // якщо оплата по реквізитам — до виплати 0
        const payout = payment === 'bank'
          ? 0
          : lines.reduce((s, r) => {
              const p = r.product || {}
              const unitSale = Number(r.my_price ?? p.price_dropship ?? 0)
              const unitDrop = Number(p.price_dropship ?? 0)
              return s + (unitSale - unitDrop) * Number(r.qty || 1)
            }, 0)
        return {
          order_no,
          created_at: first?.created_at,
          recipient_name: first?.recipient_name,
          recipient_phone: first?.recipient_phone,
          ttn: first?.ttn || '',
          status,
          payment,  // ⟵ збережемо спосіб оплати
          payout,
          lines
        }
      })
      .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
  }, [rows])

  // Пошук за ПІБ/телефоном одержувача
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return grouped
    return grouped.filter(g =>
      (g.recipient_name || '').toLowerCase().includes(t) ||
      (g.recipient_phone || '').toLowerCase().includes(t)
    )
  }, [grouped, q])

  const totalPayout = useMemo(
    () => filtered.reduce((s, g) => s + g.payout, 0),
    [filtered]
  )

  return (
    <div className="container-page my-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h1 className="h1">Мої замовлення</h1>
        <div className="flex items-center gap-2">
          <input
            className="input input-xs w-[280px]"
            placeholder="Пошук: ПІБ або телефон одержувача…"
            value={q}
            onChange={e=>setQ(e.target.value)}
          />
          <Link to="/" className="btn-outline">До каталогу</Link>
        </div>
      </div>

      {loading && <div className="card"><div className="card-body">Завантаження…</div></div>}
      {error && (
        <div className="card mb-4">
          <div className="card-body">
            <div className="h2 mb-2">Помилка</div>
            <div className="text-muted">{error}</div>
          </div>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="card"><div className="card-body text-muted">Нічого не знайдено.</div></div>
      )}

      <div className="space-y-3">
        {filtered.map(order => (
          <div key={order.order_no} className="card">
            <div className="p-4">
              {/* Шапка */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-sm text-muted">№</div>
                  <div className="text-[18px] font-semibold">{order.order_no}</div>
                  <div className="text-muted">•</div>
                  <div className="text-sm text-muted">{fmtDate(order.created_at)}</div>
                  <div className="text-muted">•</div>
                  <div className="text-sm">
                    <span className="text-muted">ТТН:&nbsp;</span>
                    <span className="font-medium">{order.ttn || '—'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded-lg text-sm bg-slate-100 text-slate-700">
                    {STATUS_UA[order.status] ?? order.status}
                  </span>
                  <span className="px-2 py-1 rounded-lg text-sm bg-indigo-50 text-indigo-700">
                    Оплата: {PAY_UA[order.payment] || order.payment}
                  </span>
                </div>
              </div>

              {/* Клієнт */}
              <div className="mb-3 text-sm">
                <span className="text-muted">Клієнт (одержувач):&nbsp;</span>
                <span className="font-medium">{order.recipient_name || '—'}</span>
                <span className="text-muted">&nbsp;•&nbsp;</span>
                <span className="font-medium">{order.recipient_phone || '—'}</span>
              </div>

              {/* Товари */}
              <div className="rounded-xl border border-slate-100">
                {order.lines.map((r, idx) => {
                  const p = r.product || {}
                  const unitSale = Number(r.my_price ?? p.price_dropship ?? 0)
                  const unitDrop = Number(p.price_dropship ?? 0)
                  const qty = Number(r.qty || 1)
                  const perLinePayout = order.payment === 'bank' ? 0 : (unitSale - unitDrop) * qty
                  return (
                    <div key={r.id} className={`p-3 flex items-center gap-3 ${idx>0 ? 'border-t border-slate-100':''}`}>
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100">
                        {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{p.name || '—'}</div>
                        <div className="text-muted text-sm">
                          К-ть: {qty} • Ціна/шт: {unitSale.toFixed(2)} ₴
                        </div>
                      </div>
                      <div className="text-right w-[160px]">
                        <div className="text-sm text-muted">До виплати</div>
                        <div className="font-semibold">{perLinePayout.toFixed(2)} ₴</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Підсумок */}
              <div className="mt-3 text-right">
                <span className="text-sm text-muted">Разом до виплати:&nbsp;</span>
                <span className="price text-[18px] font-semibold">{order.payout.toFixed(2)} ₴</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length > 0 && (
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
