import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

const STATUS = [
  { v: 'pending',     t: 'Очікує' },
  { v: 'processing',  t: 'Обробка' },
  { v: 'ordered',     t: 'Замовлено' },
  { v: 'shipped',     t: 'Відправлено' },
  { v: 'delivered',   t: 'Доставлено' },
  { v: 'canceled',    t: 'Скасовано' },
]

export default function AdminOrders() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [q, setQ] = useState('')

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    // тягнемо повязані сутності (поля user, product через FK)
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, created_at, status, qty, my_price,
        recipient_name, recipient_phone, settlement, nova_poshta_branch,
        product:products ( id, name, image_url ),
        user:profiles ( user_id, full_name, phone )
      `)
      .order('created_at', { ascending: false })
    if (!error) setRows(data || [])
    setLoading(false)
  }

  const list = useMemo(() => {
    let arr = rows
    if (statusFilter !== 'all') arr = arr.filter(r => r.status === statusFilter)
    if (q.trim()) {
      const t = q.toLowerCase()
      arr = arr.filter(r =>
        (r.recipient_name || '').toLowerCase().includes(t) ||
        (r.recipient_phone || '').toLowerCase().includes(t) ||
        (r.user?.full_name || '').toLowerCase().includes(t) ||
        (r.user?.phone || '').toLowerCase().includes(t) ||
        (r.product?.name || '').toLowerCase().includes(t)
      )
    }
    return arr
  }, [rows, statusFilter, q])

  async function changeStatus(id, status) {
    const old = rows
    setRows(s => s.map(r => r.id === id ? { ...r, status } : r)) // оптимістично
    const { error } = await supabase.from('orders').update({ status }).eq('id', id)
    if (error) {
      alert(error.message)
      setRows(old)
    }
  }

  return (
    <div className="container-page my-6">
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h1 className="h1">Адмін • Замовлення</h1>
            <button className="btn-outline" onClick={load} disabled={loading}>Оновити</button>
          </div>

          {/* фільтри */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select className="input input-xs w-[210px]" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option value="all">Всі статуси</option>
              {STATUS.map(s => <option key={s.v} value={s.v}>{s.t}</option>)}
            </select>
            <input className="input input-xs w-[260px]" placeholder="Пошук: одержувач / клієнт / телефон / товар…" value={q} onChange={e=>setQ(e.target.value)} />
            <div className="ml-auto text-muted text-sm">{list.length} запис(ів)</div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-[14px]">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Дата</th>
                  <th className="py-2 pr-3">Клієнт</th>
                  <th className="py-2 pr-3">Одержувач</th>
                  <th className="py-2 pr-3">Товар</th>
                  <th className="py-2 pr-3">Сума (грн)</th>
                  <th className="py-2 pr-3">Статус</th>
                  <th className="py-2 pr-3">Доставка</th>
                </tr>
              </thead>
              <tbody>
                {list.map(r => (
                  <tr key={r.id} className="border-t border-slate-100 align-top">
                    <td className="py-3 pr-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="py-3 pr-3">
                      <div className="font-medium">{r.user?.full_name || '—'}</div>
                      <div className="text-muted">{r.user?.phone || '—'}</div>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="font-medium">{r.recipient_name}</div>
                      <div className="text-muted">{r.recipient_phone}</div>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100">
                          {r.product?.image_url && <img src={r.product.image_url} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div>
                          <div className="font-medium">{r.product?.name || '—'}</div>
                          <div className="text-muted">x{r.qty || 1}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3 font-semibold">{Number(r.my_price).toFixed(2)}</td>
                    <td className="py-3 pr-3">
                      <select
                        className="input input-xs"
                        value={r.status}
                        onChange={e=>changeStatus(r.id, e.target.value)}
                      >
                        {STATUS.map(s => <option key={s.v} value={s.v}>{s.t}</option>)}
                      </select>
                    </td>
                    <td className="py-3 pr-3 text-sm">
                      <div>{r.settlement}</div>
                      <div className="text-muted">Відділення: {r.nova_poshta_branch}</div>
                    </td>
                  </tr>
                ))}
                {list.length===0 && (
                  <tr><td colSpan={7} className="py-6 text-center text-muted">Нічого немає</td></tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  )
}
