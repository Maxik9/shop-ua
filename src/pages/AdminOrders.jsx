import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'

/**
 * Адмін: замовлення + розрахунки з дропшиперами
 *
 * Логіка виплат:
 *  - рахуються ТІЛЬКИ замовлення з status='delivered' && payment_method='cod'
 *    (маржа = (my_price - price_dropship) * qty)
 *  - списання: якщо status='canceled' && shipping_cost>0
 *  - у підсумок потрапляють ЛИШЕ записи is_paid=false
 *  - натискаємо "Позначити оплаченим" (для замовлення) або "Виплатити користувачу" (усі його релевантні)
 */

export default function AdminOrders() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    // витягуємо максимально все необхідне за раз
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, order_no, created_at, status, qty, my_price, ttn,
        recipient_name, recipient_phone, settlement, nova_poshta_branch, comment,
        payment_method, shipping_cost, is_paid, paid_at, user_id,
        product:products ( id, name, price_dropship, image_url ),
        user:users ( id, email, full_name )
      `)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) {
      console.error(error)
      setRows([])
    } else {
      setRows(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // згрупуємо лінії по номеру замовлення
  const groups = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
      const key = r.order_no || r.id
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(r)
    }

    const list = Array.from(map.entries()).map(([order_no, lines]) => {
      const first = lines[0]

      // один статус на групу (якщо різні — вважаємо 'processing')
      const status  = lines.every(l => l.status === first.status) ? first.status : 'processing'
      const payment = first?.payment_method || 'cod'
      const isPaid  = lines.every(l => !!l.is_paid)

      // сумарні витрати на доставку для canceled
      const shippingSum = lines.reduce((s, r) => s + Number(r.shipping_cost || 0), 0)

      // маржа (технічно лише для delivered+cod і лише по НЕОПЛАЧЕНИХ)
      const marginRaw = lines.reduce((s, r) => {
        const p = r.product || {}
        const unitSale = Number(r.my_price ?? p.price_dropship ?? 0)
        const unitDrop = Number(p.price_dropship ?? 0)
        const add = (unitSale - unitDrop) * Number(r.qty || 1)
        // якщо рядок уже оплачений — не враховуємо у борг
        return s + (r.is_paid ? 0 : add)
      }, 0)

      // дебет (тільки коли canceled і лише по НЕОПЛАЧЕНИХ рядках)
      const debitRaw = lines.reduce((s, r) => {
        const add = (r.status === 'canceled' && !r.is_paid) ? Number(r.shipping_cost || 0) : 0
        return s + add
      }, 0)

      const payout = (status === 'delivered' && payment === 'cod') ? marginRaw : 0
      const debit  = debitRaw
      const net    = payout - debit

      return {
        order_no,
        created_at: first?.created_at,
        ttn: first?.ttn || '',
        status, payment, isPaid,
        user_id: first?.user_id,
        user_email: first?.user?.email || '',
        user_name: first?.user?.full_name || '',
        recipient_name: first?.recipient_name,
        recipient_phone: first?.recipient_phone,
        settlement: first?.settlement || '',
        branch: first?.nova_poshta_branch || '',
        comment: first?.comment || '',
        shippingSum,
        payout, debit, net,
        lines
      }
    })

    // фільтр по пошуку (email/телефон/ПІБ/№)
    const needle = q.trim().toLowerCase()
    const filtered = !needle
      ? list
      : list.filter(g =>
          g.order_no?.toString().includes(needle) ||
          g.user_email?.toLowerCase().includes(needle) ||
          (g.user_name || '').toLowerCase().includes(needle) ||
          (g.recipient_phone || '').includes(needle) ||
          (g.recipient_name || '').toLowerCase().includes(needle)
        )

    return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [rows, q])

  // агрегат по користувачу (неоплачене)
  const byUser = useMemo(() => {
    const map = new Map()
    for (const g of groups) {
      const uid = g.user_id || 'unknown'
      if (!map.has(uid)) map.set(uid, { user_id: uid, email: g.user_email, name: g.user_name, net: 0 })
      map.get(uid).net += g.net
    }
    return Array.from(map.values()).sort((a,b)=>b.net-a.net)
  }, [groups])

  const totalPending = useMemo(() => groups.reduce((s, g) => s + g.net, 0), [groups])

  // оновлення ТТН
  async function updateTTN(order_no, newTTN) {
    const ids = rows.filter(r => r.order_no === order_no).map(r => r.id)
    if (!ids.length) return
    const { error } = await supabase.from('orders').update({ ttn: newTTN || null }).in('id', ids)
    if (error) return
    setRows(prev => prev.map(r => ids.includes(r.id) ? { ...r, ttn: newTTN || null } : r))
  }

  // оновлення витрат на доставку (видно для canceled)
  async function updateShippingCost(order_no, value) {
    const amount = Number(value || 0)
    const ids = rows.filter(r => r.order_no === order_no).map(r => r.id)
    if (!ids.length) return
    const { error } = await supabase.from('orders').update({ shipping_cost: amount }).in('id', ids)
    if (error) return
    setRows(prev => prev.map(r => ids.includes(r.id) ? { ...r, shipping_cost: amount } : r))
  }

  // позначити оплаченим — 1 замовлення
  async function markOrderPaid(order_no) {
    // беремо тільки релевантні рядки (ще не оплачені)
    const ids = rows
      .filter(r =>
        r.order_no === order_no &&
        !r.is_paid &&
        (
          (r.status === 'delivered' && r.payment_method === 'cod') ||
          (r.status === 'canceled' && Number(r.shipping_cost) > 0)
        )
      )
      .map(r => r.id)
    if (!ids.length) return

    const { error } = await supabase
      .from('orders')
      .update({ is_paid: true, paid_at: new Date().toISOString() })
      .in('id', ids)

    if (error) return
    setRows(prev => prev.map(r => ids.includes(r.id) ? { ...r, is_paid: true, paid_at: new Date().toISOString() } : r))
  }

  // виплатити користувачу — ВСЕ нерозраховане
  async function payUser(user_id) {
    const ids = rows
      .filter(r =>
        r.user_id === user_id &&
        !r.is_paid &&
        (
          (r.status === 'delivered' && r.payment_method === 'cod') ||
          (r.status === 'canceled' && Number(r.shipping_cost) > 0)
        )
      )
      .map(r => r.id)
    if (!ids.length) return

    const { error } = await supabase
      .from('orders')
      .update({ is_paid: true, paid_at: new Date().toISOString() })
      .in('id', ids)

    if (error) return
    setRows(prev => prev.map(r => ids.includes(r.id) ? { ...r, is_paid: true, paid_at: new Date().toISOString() } : r))
  }

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Замовлення</h1>
        <div className="flex items-center gap-3">
          <input
            placeholder="Пошук: email / № / телефон / ПІБ ..."
            className="input input-sm w-[320px]"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
      </div>

      {/* підсумок по всіх відфільтрованих */}
      <div className="mb-6 rounded-xl border p-4 flex flex-wrap items-center justify-between">
        <div className="text-slate-600">Нараховано (неоплачене) по відбору:</div>
        <div className="text-xl font-bold">{totalPending.toFixed(2)} ₴</div>
      </div>

      {/* агрегація по користувачах */}
      <div className="mb-6 rounded-xl border p-4">
        <div className="mb-3 font-semibold">За користувачами (неоплачене):</div>
        <div className="space-y-2">
          {byUser.map(u => (
            <div key={u.user_id} className="flex items-center justify-between gap-3">
              <div className="text-sm">
                <div className="font-medium">{u.name || u.email || u.user_id}</div>
                <div className="text-slate-500">{u.email}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="font-semibold">{u.net.toFixed(2)} ₴</div>
                <button className="btn btn-sm" onClick={() => payUser(u.user_id)}>
                  Виплатити користувачу
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {loading && <div className="text-slate-500">Завантаження…</div>}

      {!loading && groups.map(g => (
        <div key={g.order_no} className="mb-6 rounded-xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <div className="font-semibold">№ {g.order_no}</div>
              <div className="text-slate-500">{new Date(g.created_at).toLocaleString()}</div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs">
                {g.status}{g.isPaid ? ' • виплачено' : ''}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">ТТН:</span>
                <input
                  className="input input-xs w-[200px]"
                  defaultValue={g.ttn}
                  onBlur={e => updateTTN(g.order_no, e.target.value.trim())}
                />
              </div>

              {g.status === 'canceled' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Витрати на доставку:</span>
                  <input
                    type="number"
                    min="0" step="0.01"
                    className="input input-xs w-[140px]"
                    defaultValue={g.shippingSum || 0}
                    onBlur={e => updateShippingCost(g.order_no, e.target.value)}
                  />
                </div>
              )}

              {!g.isPaid && g.net !== 0 && (
                <button className="btn btn-sm" onClick={() => markOrderPaid(g.order_no)}>
                  Позначити оплаченим
                </button>
              )}
            </div>
          </div>

          {/* Тіло замовлення (рядки) */}
          <div className="mt-3 rounded-lg border border-slate-100 divide-y">
            {g.lines.map((r) => {
              const p = r.product || {}
              const unitSale = Number(r.my_price ?? p.price_dropship ?? 0)
              const unitDrop = Number(p.price_dropship ?? 0)
              return (
                <div key={r.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img src={p.image_url || '/noimg.png'} className="w-12 h-12 object-cover rounded" />
                    <div className="text-sm">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-slate-500">x{r.qty}</div>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div>Продаж: {unitSale.toFixed(2)} ₴</div>
                    <div className="text-slate-500">Дроп: {unitDrop.toFixed(2)} ₴</div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-3 text-right space-y-1">
            <div className="text-sm text-slate-600">
              Маржа (для cod): <b>{g.payout.toFixed(2)} ₴</b>
              {g.debit > 0 && <> • Списання: <b className="text-rose-600">−{g.debit.toFixed(2)} ₴</b></>}
            </div>
            <div className="text-[17px]">
              Разом до виплати: <b>{g.net.toFixed(2)} ₴</b>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
