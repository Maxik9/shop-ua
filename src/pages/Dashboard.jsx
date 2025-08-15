import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'

export default function Dashboard() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMy = useCallback(async () => {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setRows([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, order_no, created_at, status, qty, my_price, ttn,
        recipient_name, recipient_phone, settlement, nova_poshta_branch, comment,
        payment_method, shipping_cost, is_paid, paid_at,
        product:products ( id, name, price_dropship, image_url )
      `)
      .eq('user_id', user.id)
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
    fetchMy()
  }, [fetchMy])

  // групуємо по order_no
  const orders = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
      const key = r.order_no || r.id
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(r)
    }
    return Array.from(map.entries()).map(([order_no, lines]) => {
      const first = lines[0]
      const status  = lines.every(l => l.status === first.status) ? first.status : 'processing'
      const payment = first?.payment_method || 'cod'
      const isPaid  = lines.every(l => !!l.is_paid)

      const marginRaw = lines.reduce((s, r) => {
        const p = r.product || {}
        const unitSale = Number(r.my_price ?? p.price_dropship ?? 0)
        const unitDrop = Number(p.price_dropship ?? 0)
        const add = (unitSale - unitDrop) * Number(r.qty || 1)
        return s + (r.is_paid ? 0 : add)
      }, 0)

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
        recipient_name: first?.recipient_name,
        recipient_phone: first?.recipient_phone,
        settlement: first?.settlement || '',
        branch: first?.nova_poshta_branch || '',
        comment: first?.comment || '',
        payout, debit, net,
        lines
      }
    }).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))
  }, [rows])

  const totalNet = useMemo(() => orders.reduce((s,o)=>s+o.net,0), [orders])

  return (
    <div className="p-4 md:p-6 max-w-[1100px] mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Мої замовлення</h1>
        <div className="text-xl font-bold">Баланс до виплати: {totalNet.toFixed(2)} ₴</div>
      </div>

      {loading && <div className="text-slate-500">Завантаження…</div>}

      {!loading && orders.map(order => (
        <div key={order.order_no} className="mb-6 rounded-xl border p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">
              <div className="font-semibold">№ {order.order_no}</div>
              <div className="text-slate-500">{new Date(order.created_at).toLocaleString()}</div>
            </div>
            <div className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs">
              {order.status}{order.isPaid ? ' • виплачено' : ''}
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-slate-100 divide-y">
            {order.lines.map(r => {
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
              Маржа (для cod): <b>{order.payout.toFixed(2)} ₴</b>
              {order.debit > 0 && <> • Списання: <b className="text-rose-600">−{order.debit.toFixed(2)} ₴</b></>}
            </div>
            <div className="text-[17px]">
              Разом до виплати: <b>{order.net.toFixed(2)} ₴</b>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
