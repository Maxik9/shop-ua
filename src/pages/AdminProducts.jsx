import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function AdminProducts() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([]) // {id,name}
  const [q, setQ] = useState('')
  const [stockFilter, setStockFilter] = useState('all') // all | in | out
  const [catFilter, setCatFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('categories').select('id,name').order('name')
      setCategories(data || [])
    })()
  }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    let arr = items
    if (stockFilter === 'in') arr = arr.filter(p => !!p.in_stock)
    if (stockFilter === 'out') arr = arr.filter(p => !p.in_stock)
    if (catFilter !== 'all') arr = arr.filter(p => String(p.category_id || '') === String(catFilter))
    if (!s) return arr
    return arr.filter(p =>
      (p.name || '').toLowerCase().includes(s) ||
      (p.sku || '').toLowerCase().includes(s)
    )
  }, [q, items, stockFilter, catFilter])

  async function load() {
    setLoading(true); setErr('')
    const { data, error } = await supabase.from('products').select('*').order('id', { ascending: false }).limit(1000)
    if (error) { setErr(error.message || 'Помилка'); setItems([]) } else setItems(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function copy(p) {
    const baseSku = (p.sku || 'copy')
    const newSku = `${baseSku}-copy-${Date.now().toString().slice(-5)}`
    const row = {
      sku: newSku,
      name: `Копія: ${p.name || ''}`.trim(),
      price_dropship: p.price_dropship ?? p.price ?? 0,
      description: p.description || '',
      in_stock: !!p.in_stock,
      category_id: p.category_id ?? null,
      image_url: p.image_url || null,
      gallery_json: Array.isArray(p.gallery_json) ? p.gallery_json : (p.gallery_json ? [p.gallery_json] : null),
    }
    const { data, error } = await supabase.from('products').insert(row).select().single()
    if (!error && data) {
      setItems(prev => [data, ...prev])
    }
  }

  async function remove(p) {
    if (!confirm(`Видалити товар «${p.name}»?`)) return
    const { error } = await supabase.from('products').delete().eq('id', p.id)
    if (!error) setItems(prev => prev.filter(x => x.id !== p.id))
  }

  async function updateInline(p, patch) {
    const { data, error } = await supabase.from('products').update(patch).eq('id', p.id).select().single()
    if (!error && data) {
      setItems(prev => prev.map(it => it.id === p.id ? { ...it, ...data } : it))
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex flex-wrap items-center gap-2 justify-between mb-4">
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
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <input className="input" placeholder="Пошук по назві або SKU…" value={q} onChange={e=>setQ(e.target.value)} />
            <select className="input w-48" value={stockFilter} onChange={e=>setStockFilter(e.target.value)}>
              <option value="all">Усі товари</option>
              <option value="in">Тільки в наявності</option>
              <option value="out">Тільки відсутні</option>
            </select>
            <select className="input w-56" value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
              <option value="all">Всі категорії</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="ml-auto text-muted">{filtered.length} шт.</div>
          </div>

          {loading ? <div className="text-muted">Завантаження…</div> : (
            <div className="divide-y">
              {filtered.map(p => (
                <div key={p.id} className="py-3 grid grid-cols-[64px_1fr_9rem_10rem_7rem] items-center gap-3">
                  <div className="w-16 h-16 bg-slate-100 rounded overflow-hidden flex items-center justify-center">
                    {p.image_url ? <img src={p.image_url} alt={p.name} className="object-cover w-full h-full" /> : <span className="text-xs text-slate-400">без фото</span>}
                  </div>

                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.name || '— без назви —'}</div>
                    <div className="text-xs text-slate-600 mt-0.5 truncate"><span className="opacity-70">SKU:</span> <span className="font-mono">{p.sku || '—'}</span></div>
                  </div>

                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      className="input w-24"
                      defaultValue={p.price_dropship ?? p.price ?? 0}
                      onBlur={e => updateInline(p, { price_dropship: Number(e.target.value) || 0 })}
                      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                      title="Ціна (редагується)"
                    />
                    <span>₴</span>
                  </div>

                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!p.in_stock}
                      onChange={e=>updateInline(p,{ in_stock: e.target.checked })}
                    />
                    <span className="text-sm">{p.in_stock ? 'в наявності' : 'немає'}</span>
                  </label>

                  <div className="justify-self-end">
                    <select className="input w-28" defaultValue="" onChange={async e => {
                      const val = e.target.value
                      e.target.value = ''
                      if (val === 'edit') window.location.assign(`/admin/products/${p.id}`)
                      if (val === 'copy') await copy(p)
                      if (val === 'delete') await remove(p)
                    }}>
                      <option value="" disabled>Дії</option>
                      <option value="edit">Редагувати</option>
                      <option value="copy">Копіювати</option>
                      <option value="delete">Видалити</option>
                    </select>
                  </div>
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
