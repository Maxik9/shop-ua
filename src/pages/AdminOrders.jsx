// src/pages/AdminOrders.jsx
// (твоя поточна версія — збережена; додано лише: select ... size, і в розмітці показ розміру)
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'

const STATUS_OPTIONS = [
  { v: 'all',        t: 'Всі статуси' },
  { v: 'new',        t: 'Нове' },
  { v: 'processing', t: 'В обробці' },
  { v: 'canceled',   t: 'Скасовано' },
  { v: 'shipped',    t: 'Відправлено' },
  { v: 'delivered',  t: 'Отримано' },
  { v: 'refused',    t: 'Відмова' },
  { v: 'paid',       t: 'Виплачено' },
]
const PAY_FILTERS = [
  { v: 'all',  t: 'Будь-яка оплата' },
  { v: 'cod',  t: 'Післяплата' },
  { v: 'bank', t: 'Оплата по реквізитам' },
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

export default function AdminOrders() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [q, setQ] = useState('')
  const [sortByEmailAsc, setSortByEmailAsc] = useState(true)

  const [fStatus, setFStatus] = useState('all')
  const [fPayment, setFPayment] = useState('all')
  const [fUser, setFUser] = useState('all')

  async function load() {
    setLoading(true); setError('')
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_no, created_at, status, qty, my_price, ttn, payment_method,
          recipient_name, recipient_phone, settlement, nova_poshta_branch,
          comment, payout_override, size,
          product:products ( id, name, image_url, price_dropship ),
          user:profiles ( user_id, email, full_name )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRows(data || [])
    } catch (e) {
      setError(e.message || 'Помилка завантаження')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const usersList = useMemo(() => {
    const m = new Map()
    rows.forEach(r => {
      const u = r.user
      if (u?.user_id && !m.has(u.user_id)) {
        m.set(u.user_id, { id: u.user_id, email: u.email || '(без email)' })
      }
    })
    const arr = Array.from(m.values()).sort((a,b) => (a.email||'').localeCompare(b.email||''))
    return [{ id:'all', email:'Усі дропшипери' }, ...arr]
  }, [rows])

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

      let baseSum = 0
      let hasAnyOverride = false
      for (const r of lines) {
        const p = r.product || {}
        const qty = Number(r.qty || 1)
        const unitSale = Number(r.my_price ?? p.price_dropship ?? 0)
        const unitDrop = Number(p.price_dropship ?? 0)
        const hasOverride = (r.payout_override !== null && r.payout_override !== undefined)
        let line = hasOverride ? Number(r.payout_override || 0) : (unitSale - unitDrop) * qty
        if (!hasOverride && payment === 'bank') line = 0
        if (hasOverride) hasAnyOverride = true
        baseSum += line
      }

      let payout = 0
      if (status === 'delivered') payout = baseSum
      else if (status === 'refused' || status === 'canceled') payout = hasAnyOverride ? baseSum : 0
      else if (status === 'paid') payout = 0

      const display_total = baseSum

      return {
        order_no,
        created_at: first?.created_at,
        ttn: first?.ttn || '',
        status,
        payment,
        display_total,
        payout,
        email: first?.user?.email || '',
        full_name: first?.user?.full_name || '',
        userId: first?.user?.user_id || null,
        recipient_name: first?.recipient_name,
        recipient_phone: first?.recipient_phone,
        settlement: first?.settlement || '',
        branch: first?.nova_poshta_branch || '',
        comment: first?.comment || '',
        lines,
      }
    })

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
    if (fStatus !== 'all') list = list.filter(g => g.status === fStatus)
    if (fPayment !== 'all') list = list.filter(g => g.payment === fPayment)
    if (fUser !== 'all') list = list.filter(g => g.userId === fUser)

    list.sort((a,b) => {
      if (q.includes('@')) {
        const cmp = (a.email||'').localeCompare((b.email||''))
        return sortByEmailAsc ? cmp : -cmp
      }
      return new Date(b.created_at) - new Date(a.created_at)
    })
    return list
  }, [rows, q, sortByEmailAsc, fStatus, fPayment, fUser])

  const totalPayoutVisible = useMemo(() => groups.reduce((s, g) => s + g.payout, 0), [groups])

  async function setOrderTotalOverride(order_no, total) {
    const lines = rows.filter(r => (r.order_no || r.id) === order_no)
    if (!lines.length) return
    const firstId = lines[0].id
    const restIds = lines.slice(1).map(l => l.id)

    const { error: e1 } = await supabase.from('orders').update({ payout_override: Number(total) }).eq('id', firstId)
    if (e1) return alert('Помилка збереження: ' + e1.message)

    if (restIds.length) {
      const { error: e2 } = await supabase.from('orders').update({ payout_override: 0 }).in('id', restIds)
      if (e2) return alert('Помилка збереження: ' + e2.message)
    }
    await load()
  }
  async function clearOrderOverride(order_no) {
    const { error } = await supabase.from('orders').update({ payout_override: null }).eq('order_no', order_no)
    if (error) return alert('Помилка очищення: ' + error.message)
    await load()
  }
  async function updateStatus(order_no, newStatus) {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('order_no', order_no)
    if (!error) {
      if (newStatus === 'canceled' || newStatus === 'refused') await setOrderTotalOverride(order_no, 0)
      else await load()
    }
  }
  async function updateTTN(order_no, newTTN) {
    const { error } = await supabase.from('orders').update({ ttn: newTTN }).eq('order_no', order_no)
    if (!error) await load()
  }

  return (
    <div className="max-w-6xl mx-auto px-3 py-4 sm:py-6">
      {/* … шапка + фільтри як було … */}

      {fUser !== 'all' && (
        <div className="card mb-4">
          <div className="card-body flex items-center justify-between">
            <div className="font-medium">Сума до виплати вибраному дропшиперу (з урахуванням статусів)</div>
            <div className="text-2xl font-bold">{totalPayoutVisible.toFixed(2)} ₴</div>
          </div>
        </div>
      )}

      {loading && <div className="card"><div className="card-body">Завантаження…</div></div>}
      {error && <div className="card mb-4"><div className="card-body"><div className="h2 mb-2">Помилка</div><div className="text-muted">{error}</div></div></div>}

      <div className="space-y-3">
        {groups.map(g => (
          <div key={g.order_no} className="card">
            <div className="p-4 space-y-3">
              {/* шапка замовлення … */}

              {/* Рядки */}
              <div className="rounded-xl border border-slate-100">
                {g.lines.map((r, idx) => {
                  const p = r.product || {}
                  const qty = Number(r.qty || 1)
                  const unitSale = Number(r.my_price ?? p.price_dropship ?? 0)
                  const unitDrop = Number(p.price_dropship ?? 0)
                  const hasOverride = (r.payout_override !== null && r.payout_override !== undefined)
                  let lineBase = hasOverride ? Number(r.payout_override || 0) : (unitSale - unitDrop) * qty
                  if (!hasOverride && g.payment === 'bank') lineBase = 0

                  return (
                    <div key={r.id} className={`p-3 flex flex-col sm:flex-row sm:items-center gap-3 ${idx>0 ? 'border-t border-slate-100':''}`}>
                      <div className="hidden sm:block w-16 h-16 rounded-lg overflow-hidden bg-slate-100 sm:flex-none">
                        {p.image_url && <img src={p.image_url} className="w-full h-full object-cover" alt="" />}
                      </div>
                      <div className="flex-1 min-w-0 max-w-full">
                        <Link to={`/product/${p.id}`} className="font-medium hover:text-indigo-600 break-words whitespace-normal leading-snug">{p.name || '—'}</Link>
                        <div className="text-muted text-sm">
                          К-ть: {qty} • Ціна/шт: {unitSale.toFixed(2)} ₴
                          {/* НОВЕ: показ розміру */}
                          {r.size ? <> • Розмір: <b className="text-slate-700">{r.size}</b></> : null}
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

              {/* футер … (Разом до виплати, оверрайд) */}
            </div>
          </div>
        ))}
      </div>

      {groups.length > 0 && (
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
