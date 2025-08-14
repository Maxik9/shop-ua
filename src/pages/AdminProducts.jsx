import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function AdminProducts() {
  const nav = useNavigate()
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return items
    return items.filter(p =>
      (p.name || '').toLowerCase().includes(s) ||
      (p.sku || '').toLowerCase().includes(s)
    )
  }, [q, items])

  async function load() {
    setLoading(true); setErr('')
    const { data, error } = await supabase.from('products').select('*').order('id', { ascending: false }).limit(1000)
    if (error) { setErr(error.message || 'Помилка'); setItems([]) } else setItems(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function copy(p) {
    const baseSku = p.sku || 'copy'
    const newSku = `${baseSku}-copy-${Date.now().toString().slice(-5)}`
    const row = {
      sku: newSku,
      name: `Копія: ${p.name || ''}`.trim(),
      price_dropship: p.price_dropship ?? p.price ?? 0,
      description: p.description || '',
      in_stock: !!p.in_stock,
      category_id: p.category_id ?? null,
      image_url: p.image_url || null,
      gallery_json: p.gallery_json || null,
      active: p.active ?? true,
    }
    const { data, error } = await supabase.from('products').insert(row).select().maybeSingle()
    if (!error && data) {
      setItems(prev => [data, ...prev])
    }
  }

  async function remove(p) {
    if (!confirm(`Видалити товар «${p.name}»?`)) return
    const { error } = await supabase.from('products').delete().eq('id', p.id)
    if (!error) setItems(prev => prev.filter(x => x.id !== p.id))
  }

  function onAction(p, action) {
    if (!action) return
    if (action === 'edit') nav(`/admin/products/${p.id}`)
    if (action === 'copy') copy(p)
    if (action === 'delete') remove(p)
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Товари</h1>
        <div className="flex gap-2">
          <button className="btn-outline" onClick={load}>Оновити</button>
          <Link to="/admin/products/new" className="btn-primary">+ Новий товар</Link>
          <Link to="/admin" className="btn-ghost">← Адмін</Link>
        </div>
      </div>

      {err && <div className="mb-3 text-red-600 text-sm">Помилка: {err}</div>}

      <div className="card">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-3">
            <input className="input" placeholder="Пошук по назві або SKU…" value={q} onChange={e=>setQ(e.target.value)} />
            <div className="ml-auto text-muted">{filtered.length} шт.</div>
          </div>

          {loading ? <div className="text-muted">Завантаження…</div> : (
            <div className="divide-y">
              {filtered.map(p => (
                <div key={p.id} className="py-3 flex items-center gap-3">
                  <div className="w-14 h-14 bg-slate-100 rounded overflow-hidden flex items-center justify-center">
                    {p.image_url ? <img src={p.image_url} alt={p.name} className="object-cover w-full h-full" /> : <span className="text-xs text-slate-400">без фото</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-sm text-slate-500 truncate">{p.sku}</div>
                  </div>
                  <div className="w-24 text-right">{(p.price_dropship ?? p.price ?? 0).toFixed(2)} ₴</div>
                  <div className="w-28 text-center text-sm">{p.in_stock ? 'в наявності' : 'немає'}</div>

                  <select className="input w-36" defaultValue="" onChange={e => { onAction(p, e.target.value); e.target.value='' }}>
                    <option value="" disabled>Дії</option>
                    <option value="edit">Редагувати</option>
                    <option value="copy">Копіювати</option>
                    <option value="delete">Видалити</option>
                  </select>
                </div>
              ))}
              {(!loading && filtered.length === 0) && <div className="text-muted">Нічого не знайдено.</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
