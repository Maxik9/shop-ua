// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'

const STATUS_UA = {
  pending: 'Нове',
  processing: 'В обробці',
  ordered: 'Замовлено',
  shipped: 'Відправлено',
  delivered: 'Доставлено',
  canceled: 'Скасовано',
}
const PAY_UA = { cod: 'Післяплата', bank: 'Оплата по реквізитам' }

function fmtDate(ts) {
  try {
    const d = new Date(ts)
    return d.toLocaleString('uk-UA', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return ts }
}

export default function Dashboard() {
  const [rows, setRows]   = useState([])
  const [loading, setL]   = useState(true)
  const [error, setErr]   = useState('')
  const [q, setQ]         = useState('') // пошук по ПІБ/телефону одержувача

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setL(true); setErr('')
      try {
        const { data: s } = await supabase.auth.getSession()
        const uid = s?.session?.user?.id
        if (!uid) throw new Error('Необхідна авторизація')

        // Без ризикових JOIN — беремо всі колонки з orders і вкладений продукт
        const { data, error } = await supabase
          .from('orders')
          .select(`*, product:products ( id, name, image_url, price_dropship )`)
          .eq('user_id', uid)
          .order('created_at', { ascending: false })

        if (error) throw error
        if (mounted) setRows(data || [])
      } catch (e) {
        if (mounted) setErr(e.message || 'Помилка завантаження')
      } finally {
        if (mounted) setL(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  // Групування рядків у замовлення (order_no)
  const grouped = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
      const key = r.order_no || r.id
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(r)
    }
    const list = Array.from(map.entries()).map(([order_no, lines]) => {
      const first   = lines[0]
      const status  = lines.every(l => l.status === first.status) ? first.status : 'processing'
      const payment = first?.payment_method || 'cod'

      const payout = payment === 'bank' ? 0 : lines.reduce((s, r) => {
        const p        = r.product || {}
        const unitSale = Number(r.my_price ?? p.price_dropship ?? 0)
        const unitDrop = Number(p.price_dropship ?? 0)
        return s + (unitSale - unitDrop) * Number(r.qty || 1)
      }, 0)

      return {
        order_no,
        created_at: first?.created_at,
        recipient_name: first?.recipient_name,
        recipient_phone: first?.recipient_phone,
        settlement: first?.settlement || '',
        branch: first?.nova_poshta_branch || '',
        ttn: first?.ttn || '',
        comment: first?.comment || '',
        status, payment, payout, lines,
      }
    })
    return list.sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
  }, [rows])

  // Пошук по одержувачу
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return grouped
    return grouped.filter(g =>
      (g.recipient_name || '').toLowerCase().includes(t) ||
      (g.recipient_phone || '').toLowerCase().includes(t)
    )
  }, [grouped, q])

  const totalPayout = useMemo(() =>
    filtered.reduce((s, g) => s + g.payout, 0), [filtered])

  return (
    <div className="max-w-6xl mx-auto px-3 py-4 sm:py-6">
      {/* Шапка + пошук + баланс праворуч (як на твоєму скріні) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h1 className="h1">Мої замовлення</h1>
        <div className="flex items-center gap-3">
          <div className="text-[18px]">
            <span className="text-muted">Сума до виплати:&nbsp;</span>
            <span className="price text-[22px] font-semibold">
              {totalPayout.toFixed(2)} ₴
            </span>
          </div>
          <input
            className="input input-xs w-[260px] sm:w-[320px]"
            placeholder="Пошук: ПІБ або телефон одержувача…"
            value={q}
            onChange={(e)=>setQ(e.target.value)}
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
              {/* Верхній ряд */}
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

              {/* Одержувач */}
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

              {/* Коментар (якщо є) */}
              {order.comment && (
                <div className="text-sm mb-3">
                  <span className="text-muted">Коментар:&nbsp;</span>
                  <span className="font-medium whitespace-pre-wrap">{order.comment}</span>
                </div>
              )}

              {/* Лінії замовлення */}
              <div className="rounded-xl border border-slate-100">
                {order.lines.map((r, idx) => {
                  const p        = r.product || {}
                  const unitSale = Number(r.my_price ?? p.price_dropship ?? 0)
                  const unitDrop = Number(p.price_dropship ?? 0)
                  const qty      = Number(r.qty || 1)
                  const perLine  = order.payment === 'bank' ? 0 : (unitSale - unitDrop) * qty

                  return (
                    <div key={r.id}
                      className={`p-3 flex flex-col sm:flex-row sm:items-center gap-3 ${idx>0?'border-t border-slate-100':''}`}>
                      <div className="hidden sm:block w-16 h-16 rounded-lg overflow-hidden bg-slate-100 sm:flex-none">
                        {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link to={`/product/${p.id}`} className="font-medium ho
