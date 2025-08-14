// src/pages/AdminProducts.jsx
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

/**
 * Адмін • Товари (повернули все як було + додали безпечне видалення)
 * - Кнопки праворуч: "Імпорт товарів" і "Новий товар"
 * - Редагування: /admin/products/:id
 * - Створення:   /admin/products/new
 * - Імпорт:      /admin/products/import
 * - Видалення:   реальний DELETE у БД + обробка RLS/помилок
 */
export default function AdminProducts() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  async function load() {
    setLoading(true); setError('')
    const { data, error } = await supabase
      .from('products')
      .select('id, name, sku, price_dropship, image_url, in_stock')
      .order('name', { ascending: true })
      .limit(1000)

    if (error) setError(error.message)
    setRows(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function deleteProduct(p) {
    if (!p?.id) return
    const ok = window.confirm(`Видалити товар "${p.name}" безповоротно?`)
    if (!ok) return

    const prev = rows
    setRows(prev.filter(r => r.id !== p.id)) // оптимістичне оновлення

    const { error: delErr } = await supabase
      .from('products')
      .delete()
      .eq('id', p.id)

    if (delErr) {
      setRows(prev)
      const rlsHint = delErr.message?.toLowerCase().includes('row level security') ||
                      delErr.message?.toLowerCase().includes('row-level security')
        ? '\n\nПроблема з RLS. Додай політику DELETE для таблиці products.'
        : ''
      alert(`Помилка видалення: ${delErr.message}${rlsHint}`)
      console.error(delErr)
      return
    }

    // (необовʼязково) видалимо файл з бакету, якщо це наш public URL
    try {
      const marker = '/product-images/'
      const url = p.image_url || ''
      if (url.includes(marker)) {
        const path = decodeURIComponent(url.split(marker)[1] || '')
        if (path) await supabase.storage.from('product-images').remove([path])
      }
    } catch (e) {
      console.warn('Не вдалося видалити файл зі стореджу (не критично):', e)
    }
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter(r =>
      (r.name || '').toLowerCase().includes(s) ||
      (r.sku  || '').toLowerCase().includes(s)
    )
  }, [rows, q])

  return (
    <div className="container-page py-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="h1">Адмін • Товари</h1>

        <div className="flex items-center gap-2">
          <Link className="btn-outline" to="/admin/products/import">Імпорт товарів</Link>
          <Link className="btn-primary" to="/admin/products/new">Новий товар</Link>
        </div>
      </div>

      {error && <div className="alert-error mb-3">{error}</div>}

      <div className="mb-3 flex items-center gap-2">
        <input
          className="input w-full sm:w-80"
          placeholder="Пошук по назві або SKU…"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
        />
        <button className="btn-ghost" onClick={load}>Оновити</button>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-muted">Завантаження…</div>
          ) : filtered.length === 0 ? (
            <div className="text-muted">Нічого не знайдено.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map(p => (
                <div key={p.id} className="flex items-center gap-3 border rounded-xl px-3 py-2">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 flex-none">
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                    ) : null}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.name || 'Без назви'}</div>
                    <div className="text-sm text-muted truncate">
                      SKU: {p.sku || '—'} • {Number(p.price_dropship||0).toFixed(2)} ₴ • {p.in_stock ? 'в наявності' : 'нема'}
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
