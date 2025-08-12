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

// колірні бейджі для статусів
function StatusBadge({ status }) {
  const s = status || 'pending'
  const map = {
    pending:   'bg-slate-100 text-slate-700',
    processing:'bg-amber-100 text-amber-700',
    ordered:   'bg-blue-100 text-blue-700',
    shipped:   'bg-indigo-100 text-indigo-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    canceled:  'bg-rose-100 text-rose-700',
  }
  const cls = map[s] || map.pending
  return (
    <span className={`px-2 py-1 rounded-lg text-sm ${cls}`}>
      {STATUS_UA[s] ?? s}
    </span>
  )
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
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true); setError('')
      try {
        // вибираємо замовлення користувача з приєднаним продуктом
        const { data: sessionData } = await supabase.auth.getSession()
        const uid = sessionData?.session?.user?.id
        if (!uid) throw new Error('Необхідна авторизація')

        const { data, error } = await supabase
          .from('orders')
          .select(`
            id, status, qty, my_price, created_at,
            product:products(id, name, image_url, price_dropship)
          `)
          .eq('user_id', uid)
          .order('created_at', { ascending: false })

        if (error) throw error
        if (mounted) setOrders(data || [])
      } catch (e) {
        if (mounted) setError(e.message || 'Помилка завантаження')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const totalAll = useMemo(() =>
    (orders || []).reduce((sum, o) => sum + Number(o.my_price || 0) * Number(o.qty || 1), 0)
  , [orders])

  return (
    <div className="container-page my-6">
      <div className="flex items-center justify-between mb-4">
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

      {!loading && !error && orders.length === 0 && (
        <div className="card">
          <div className="card-body text-muted">Замовлень поки немає.</div>
        </div>
      )}

      <div className="space-y-3">
        {orders.map(o => {
          const p = o.product || {}
          const unit = Number(o.my_price ?? p.price_dropship ?? 0)
          const qty  = Number(o.qty || 1)
          const line = unit * qty
        return (
          <div key={o.id} className="card">
            <div className="p-4 flex items-center gap-4">
              <div className="w-[96px] h-[72px] rounded-xl overflow-hidden bg-slate-100">
                {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-semibold truncate">{p.name || 'Товар'}</div>
                  <StatusBadge status={o.status} />
                </div>
                <div className="text-muted text-sm mt-1">
                  Створено: {fmtDate(o.created_at)}
                </div>
              </div>

              <div className="hidden sm:block text-right text-sm text-muted">
                <div>Кількість</div>
                <div className="font-medium text-slate-900">{qty}</div>
              </div>

              <div className="hidden sm:block text-right text-sm text-muted">
                <div>Ціна / шт</div>
                <div className="font-medium text-slate-900">{unit.toFixed(2)} ₴</div>
              </div>

              <div className="text-right">
                <div className="text-sm text-muted">Сума</div>
                <div className="font-semibold">{line.toFixed(2)} ₴</div>
              </div>
            </div>
          </div>
        )})}
      </div>

      {orders.length > 0 && (
        <div className="mt-4 text-right">
          <div className="text-[18px]">
            Разом:&nbsp;<span className="price text-[22px]">{totalAll.toFixed(2)} ₴</span>
          </div>
        </div>
      )}
    </div>
  )
}
