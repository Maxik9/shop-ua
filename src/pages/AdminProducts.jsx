import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import HtmlContent from '../components/HtmlContent'

function uid() {
  return Date.now() + '-' + Math.random().toString(36).slice(2, 8)
}

async function uploadToBucket(file, folder = 'products') {
  const bucket = 'product-images'
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${folder}/${uid()}.${ext}`
  const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false })
  if (upErr) throw upErr
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path)
  return pub.publicUrl
}

export default function AdminProducts() {
  // форма
  const [id, setId] = useState(null)
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [desc, setDesc] = useState('')          // HTML description
  const [inStock, setInStock] = useState(true)
  const [mainFile, setMainFile] = useState(null)
  const [galleryFiles, setGalleryFiles] = useState([])

  // список
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [loadError, setLoadError] = useState('')

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return items
    return items.filter(p =>
      (p.name || '').toLowerCase().includes(s) ||
      (p.sku || '').toLowerCase().includes(s)
    )
  }, [q, items])

  async function load() {
    setLoading(true); setLoadError('')
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('id', { ascending: false })
      .limit(500)
    if (error) {
      console.error('[AdminProducts] load error:', error)
      setLoadError(error.message || 'Помилка завантаження')
      setItems([])
    } else {
      setItems(data || [])
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function resetForm() {
    setId(null); setSku(''); setName(''); setPrice('')
    setDesc(''); setInStock(true); setMainFile(null); setGalleryFiles([])
  }

  async function save() {
    try {
      setSaving(true); setMsg('')
      let mainUrl = null
      if (mainFile) mainUrl = await uploadToBucket(mainFile)
      let galleryUrls = []
      if (galleryFiles?.length) {
        for (const f of galleryFiles) galleryUrls.push(await uploadToBucket(f))
      }

      const row = {
        sku: sku.trim(),
        name: name.trim(),
        price_dropship: Number(price) || 0,
        description: desc || '',
        in_stock: !!inStock,
      }
      if (mainUrl) row.image_url = mainUrl
      if (galleryUrls.length) row.gallery_json = galleryUrls

      let result
      if (id) {
        result = await supabase.from('products').update(row).eq('id', id).select().maybeSingle()
      } else {
        result = await supabase.from('products').insert(row).select().maybeSingle()
      }
      if (result.error) throw result.error

      setMsg('Збережено')
      resetForm()
      load()
    } catch (e) {
      setMsg(e.message || 'Помилка збереження')
    } finally {
      setSaving(false)
    }
  }

  function edit(p) {
    setId(p.id)
    setSku(p.sku || '')
    setName(p.name || '')
    setPrice(String(p.price_dropship ?? p.price ?? ''))
    setDesc(p.description || '')
    setInStock(!!p.in_stock)
    setMainFile(null)
    setGalleryFiles([])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function remove(p) {
    if (!confirm(`Видалити товар "${p.name}"?`)) return
    const { error } = await supabase.from('products').delete().eq('id', p.id)
    if (!error) load()
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Товари</h1>
        <Link to="/admin" className="btn-outline">← Адмін</Link>
      </div>

      {loadError && (
        <div className="mb-3 text-sm text-red-600">Помилка: {loadError}</div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Форма */}
        <div className="card">
          <div className="card-body">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Артикул (SKU)</label>
                <input className="input" value={sku} onChange={e=>setSku(e.target.value)} />

                <label className="label mt-3">Назва</label>
                <input className="input" value={name} onChange={e=>setName(e.target.value)} />

                <label className="label mt-3">Дроп-ціна (грн)</label>
                <input className="input" type="number" value={price} onChange={e=>setPrice(e.target.value)} />

                <label className="label mt-3">Наявність</label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={inStock} onChange={e=>setInStock(e.target.checked)} />
                  <span>{inStock ? 'В наявності' : 'Немає'}</span>
                </label>
              </div>

              <div>
                <label className="label">Головне фото (опц.)</label>
                <input className="input" type="file" accept="image/*"
                       onChange={e=>setMainFile(e.target.files?.[0] || null)} />

                <label className="label mt-3">Галерея (можна кілька)</label>
                <input className="input" type="file" multiple accept="image/*"
                       onChange={e=>setGalleryFiles(Array.from(e.target.files || []))} />
              </div>
            </div>

            <label className="label mt-4">Опис (HTML)</label>
            <textarea
              className="input min-h-[200px] font-mono"
              placeholder="Вставляй/пиши HTML тут…"
              value={desc}
              onChange={e=>setDesc(e.target.value)}
            />

            <div className="flex gap-3 mt-4">
              <button disabled={saving} className="btn-primary" onClick={save}>
                {saving ? 'Збереження…' : (id ? 'Оновити' : 'Створити')}
              </button>
              <button className="btn-ghost" onClick={resetForm}>Скинути</button>
              {msg && <div className="text-emerald-700 self-center">{msg}</div>}
            </div>

            <div className="mt-6">
              <div className="text-sm text-slate-600 mb-2">Превʼю опису (як на сайті)</div>
              <div className="card">
                <div className="card-body overflow-x-hidden">
                  <HtmlContent html={desc} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Список */}
        <div className="card">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-3">
              <input
                className="input"
                placeholder="Пошук по назві або SKU…"
                value={q}
                onChange={e=>setQ(e.target.value)}
              />
              <div className="text-muted ml-auto">{filtered.length} шт.</div>
            </div>

            {loading ? (
              <div className="text-muted">Завантаження…</div>
            ) : (
              <div className="divide-y">
                {filtered.map(p => (
                  <div key={p.id} className="py-3 flex items-center gap-3">
                    <div className="w-14 h-14 bg-slate-100 rounded overflow-hidden flex items-center justify-center">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="object-cover w-full h-full" />
                      ) : (<span className="text-xs text-slate-400">без фото</span>)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="text-sm text-slate-500 truncate">{p.sku}</div>
                    </div>
                    <div className="w-24 text-right">{(p.price_dropship ?? p.price ?? 0).toFixed(2)} ₴</div>
                    <div className="w-28 text-center text-sm">{p.in_stock ? 'в наявності' : 'немає'}</div>
                    <div className="flex gap-2">
                      <button className="btn-outline" onClick={() => edit(p)}>Редагувати</button>
                      <button className="btn-ghost" onClick={() => remove(p)}>Видалити</button>
                    </div>
                  </div>
                ))}
                {(!loading && filtered.length === 0) && <div className="text-muted">Нічого не знайдено.</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
