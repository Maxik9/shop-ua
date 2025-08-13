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

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true); setError('')
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const uid = sessionData?.session?.user?.id
        if (!uid) throw new Error('Необхідна авторизація')

        // Тягнемо замовлення поточного користувача + прив’язаний товар
        const { data, error } = await supabase
          .from('orders')
          .select(`
            id, created_at, status, qty, my_price, ttn,
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

  const totalPayout = useMemo(() => {
    return (rows || []).reduce((sum, r) => {
      const p = r.product || {}
      const unitSale = Number(r.my_price ?? p.price_dropship ?? 0)  // ціна продажу за 1
      const unitDrop = Number(p.price_dropship ?? 0)                // дроп-ціна сайту за 1
      const qty = Number(r.qty || 1)
      const diff = (unitSale - unitDrop) * qty
      return sum + diff
    }, 0)
  }, [rows])

  return (
    <div className="container-page my-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h1 className="h1">Мої замовлення</h1>
        <Link to="/" className="btn-outline">До каталогу</Link>
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

      {!loading && !error && rows.length === 0 && (
        <div className="card">
          <div className="card-body text-muted">Замовлень поки немає.</div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="card">
          <div className="card-body overflow-x-auto">
            <table className="min-w-full text-[14px]">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Дата</th>
                  <th className="py-2 pr-3">Клієнт</th>
                  <th className="py-2 pr-3">Товар</th>
                  <th className="py-2 pr-3">ТТН</th>
                  <th className="py-2 pr-3">Статус</th>
                  <th className="py-2 pr-3 text-right">Сума до виплати</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const p = r.product || {}
                  const unitSale = Number(r.my_price ?? p.price_dropship ?? 0)
                  const unitDrop = Number(p.price_dropship ?? 0)
                  const qty = Number(r.qty || 1)
                  const payout = (unitSale - unitDrop) * qty  // ВИНАГОРОДА
                  return (
                    <tr key={r.id} className="border-t border-slate-100 align-top">
                      <td className="py-3 pr-3 whitespace-nowrap">{fmtDate(r.created_at)}</td>

                      <td className="py-3 pr-3">
                        <div className="font-medium">{r.recipient_name || '—'}</div>
                        <div className="text-muted">{r.recipient_phone || '—'}</div>
                      </td>

                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100">
                            {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <div>
                            <div className="font-medium">{p.name || '—'}</div>
                            <div className="text-muted text-sm">
                              К-ть: {qty} • Ціна/шт: {unitSale.toFixed(2)} ₴
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 pr-3">
                        {r.ttn ? (
                          <div className="font-medium">{r.ttn}</div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>

                      <td className="py-3 pr-3">
                        <span className="px-2 py-1 rounded-lg text-sm bg-slate-100 text-slate-700">
                          {STATUS_UA[r.status] ?? r.status}
                        </span>
                      </td>

                      <td className="py-3 pr-0 text-right font-semibold">
                        {payout.toFixed(2)} ₴
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-4 text-right">
          <div className="text-[18px]">
            Разом до виплати:&nbsp;
            <span className="price text-[22px]">{totalPayout.toFixed(2)} ₴</span>
          </div>
        </div>
      )}
    </div>
  )
}
