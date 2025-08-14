// src/pages/AdminProducts.jsx
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

/**
 * Адмін • Товари — список з видаленням
 * - Показує товари (name, price_dropship, category_name якщо є)
 * - Кнопка "Видалити" робить справжнє DELETE у БД і видаляє з state
 * - Ретельне виведення помилок (наприклад, RLS)
 */
export default function AdminProducts() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true); setError('')
    const { data, error } = await supabase
      .from('products')
      .select('id, name, sku, price_dropship, image_url')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) setError(error.message)
    setRows(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function deleteProduct(p) {
    if (!p?.id) return
    const ok = window.confirm(`Видалити товар "${p.name}" безповоротно?`)
    if (!ok) return

    // оптимістично прибираємо зі списку
    const prev = rows
    setRows(prev.filter(r => r.id !== p.id))

    try {
      const { error: delErr } = await supabase
        .from('products')
        .delete()
        .eq('id', p.id)

      if (delErr) {
        // повертаємо назад і показуємо помилку
        setRows(prev)
        const hint = delErr.message?.toLowerCase().includes('row-level security')
          ? '\n\nСхоже, RLS забороняє видалення. Додай політику DELETE для таблиці products для твого адмін-користувача.'
          : ''
        alert(`Помилка видалення: ${delErr.message}${hint}`)
        console.error(delErr)
        return
      }

      // (необовʼязково) видалити головне фото зі стореджу, якщо воно з нашого бакету
      try {
        const url = p.image_url || ''
        // очікуємо шляхи виду:
        // https://<project>.supabase.co/storage/v1/object/public/product-images/<path>
        const marker = '/product-images/'
        if (url.includes(marker)) {
          const path = decodeURIComponent(url.split(marker)[1] || '')
          if (path) {
            await supabase.storage.from('product-images').remove([path])
          }
        }
      } catch (e) {
        console.warn('Не вдалося прибрати фото зі стореджу (не критично):', e)
      }
    } catch (e) {
      setRows(prev)
      alert(`Неочікувана помилка: ${e.message}`)
      console.error(e)
    }
  }

  const total = useMemo(() => rows.length, [rows])

  return (
    <div className="container-page py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="h1">Адмін • Товари</h1>
        <Link className="btn-primary" to="/admin/products/new">Новий товар</Link>
      </div>

      {error && <div className="alert-error mb-3">{error}</div>}

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-muted">Завантаження…</div>
          ) : total === 0 ? (
            <div className="text-muted">Поки що немає товарів.</div>
          ) : (
            <div className="space-y-3">
              {rows.map(p => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 border rounded-xl px-3 py-2"
                >
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 flex-none">
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                    ) : null}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.name || 'Без назви'}</div>
                    <div className="text-sm text-muted truncate">
                      SKU: {p.sku || '—'} • {Number(p.price_dropship||0).toFixed(2)} ₴
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link className="btn-outline" to={`/admin/products/${p.id}`}>Редагувати</Link>
                    <button className="btn-ghost text-red-600" onClick={() => deleteProduct(p)}>Видалити</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
