import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function AdminProducts() {
  const nav = useNavigate()
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
      active: p.active ?? true,
    }
    const { data, error } = await supabase.from('products').insert(row).select().maybeSingle()
    if (!error && data) {
      nav(`/admin/products/${data.id}`)
    }
  }

  async function remove(p) {
    if (!confirm(`Видалити товар «${p.name}»?`)) return
    const { error } = await supabase.from('products').delete().eq('id', p.id)
    if (!error) setItems(prev => prev.filter(x => x.id !== p.id))
  }

  async function updateInline(p, patch) {
    const { data, error } = await supabase.from('products').update(patch).eq('id', p.id).select().maybeSingle()
    if (!error && data) {
      setItems(prev => prev.map(it => it.id === p.id ? { ...it, ...data } : it))
    }
  }

  function onAction(p, action) {
    if (!action) return
    if (action === 'edit') nav(`/admin/products/${p.id}`)
    if (action === 'copy') copy(p)
    if (action === 'delete') remove(p)
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
            <select className="input w-56" value={stockFilter} onChange={e=>setStockFilter(e.target.value)}>
              <option value="all">Усі товари</option>
              <option value="in">Тільки в наявності</option>
              <option value="out">Тільки відсутні</option>
            </select>
            <select className="input w-64" value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
              <option value="all">Всі категорії</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="ml-auto text-muted">{filtered.length} шт.</div>
          </div>

          {loading ? <div className="text-muted">Завантаження…</div> : (
            <div className="divide-y">
              {filtered.map(p => (
                <div key={p.id} className="py-3 flex items-center gap-3">
                  <div className="w-14 h-14 bg-slate-100 rounded overflow-hidden flex items-center justify-center">
                    {p.image_url ? <img src={p.image_url} alt={p.name} className="object-cover w-full h-full" /> : <span className="text-xs text-slate-400">без фото</span>}
                  </div>

                  <div className="flex-[2] min-w-0">
                    <div className="font-medium truncate">{p.name || '— без назви —'}</div>
                    <div className="text-xs text-slate-600 mt-0.5">SKU: <span className="font-mono">{p.sku || '—'}</span></div>
                  </div>

                  <div className="flex items-center gap-1 w-36">
                    <input
                      type="number"
                      className="input w-full"
                      defaultValue={p.price_dropship ?? p.price ?? 0}
                      onBlur={e => updateInline(p, { price_dropship: Number(e.target.value) || 0 })}
                      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                      title="Ціна (редагується)"
                    />
                    <span>₴</span>
                  </div>

                  <label className="inline-flex items-center gap-2 w-44 justify-center">
                    <input type="checkbox" checked={!!p.in_stock} onChange={e=>updateInline(p,{ in_stock: e.target.checked, active: e.target.checked })} />
                    <span className="text-sm">{p.in_stock ? 'в наявності' : 'немає'}</span>
                  </label>

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
