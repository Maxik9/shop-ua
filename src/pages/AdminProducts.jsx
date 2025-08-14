import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

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
  const [desc, setDesc] = useState('')
  const [inStock, setInStock] = useState(true)
  const [mainFile, setMainFile] = useState(null)
  const [galleryFiles, setGalleryFiles] = useState([])

  // список
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return items
    return items.filter(p =>
      (p.name || '').toLowerCase().includes(s) ||
      (p.sku || '').toLowerCase().includes(s)
    )
  }, [q, items])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('id, sku, name, price_dropship, image_url, in_stock')
      .order('created_at', { ascending: false })
      .limit(500)
    if (!error) setItems(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function resetForm() {
    setId(null); setSku(''); setName(''); setPrice(''); setDesc('')
    setInStock(true); setMainFile(null); setGalleryFiles([])
  }

  async function save() {
    if (!sku.trim() || !name.trim()) {
      setMsg('Вкажіть SKU і назву'); return
    }
    setSaving(true); setMsg('')
    try {
      // 1) завантаження фото (якщо задані)
      let mainUrl = null
      const galleryUrls = []

      if (mainFile) {
        mainUrl = await uploadToBucket(mainFile)
      }

      for (const f of galleryFiles) {
        const url = await uploadToBucket(f)
        galleryUrls.push(url)
      }

      // якщо головне не вибрано — беремо перше з галереї
      if (!mainUrl && galleryUrls.length) {
        mainUrl = galleryUrls[0]
      }

      // 2) підготовка запису
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

  async function edit(p) {
    setId(p.id)
    setSku(p.sku || '')
    setName(p.name || '')
    setPrice(String(p.price_dropship || ''))
    // підтягуємо опис і галерею для редагування
    const { data } = await supabase.from('products')
      .select('description, gallery_json, in_stock')
      .eq('id', p.id).single()
    setDesc(data?.description || '')
    setInStock(!!data?.in_stock)
    setMainFile(null); setGalleryFiles([])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function toggleStock(p) {
    const { error } = await supabase.from('products')
      .update({ in_stock: !p.in_stock }).eq('id', p.id)
    if (!error) {
      setItems(prev => prev.map(x => x.id === p.id ? { ...x, in_stock: !x.in_stock } : x))
    }
  }

  async function remove(p) {
    if (!confirm(`Видалити "${p.name}"?`)) return
    const { error } = await supabase.from('products').delete().eq('id', p.id)
    if (error) {
      alert('Не вдалось видалити (можливо, є замовлення на цей товар). Я вимкну наявність.')
      await supabase.from('products').update({ in_stock: false }).eq('id', p.id)
      setItems(prev => prev.map(x => x.id === p.id ? { ...x, in_stock: false } : x))
    } else {
      setItems(prev => prev.filter(x => x.id !== p.id))
    }
  }

  return (
    <div className="container-page py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="h1">Адмін • Товари</h1>

        <div className="flex gap-2">
          <Link to="/admin/import" className="btn-outline">Імпорт XLSX</Link>
          <button className="btn-primary" onClick={resetForm}>Новий товар</button>
        </div>
      </div>

      {/* Форма */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="grid md:grid-cols-2 gap-4">
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

          <label className="label mt-3">Опис (HTML дозволено)</label>
          <textarea className="input" rows={6} value={desc} onChange={e=>setDesc(e.target.value)} />

          <div className="mt-4 flex gap-2">
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Зберігаю…' : (id ? 'Зберегти зміни' : 'Створити')}
            </button>
            {msg && <div className="text-sm text-muted self-center">{msg}</div>}
          </div>
        </div>
      </div>

      {/* Пошук */}
      <div className="mb-3">
        <input className="input" placeholder="Пошук по назві або SKU…" value={q} onChange={e=>setQ(e.target.value)} />
      </div>

      {/* Список */}
      <div className="card">
        <div className="card-body">
          {loading ? 'Завантаження…' : (
            <div className="space-y-3">
              {filtered.map(p => (
                <div key={p.id} className="flex items-center gap-3 border rounded-xl p-3">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 flex-none">
                    {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-sm text-muted truncate">SKU: {p.sku}</div>
                  </div>
                  <div className="w-24 text-right text-sm">{(p.price_dropship ?? 0).toFixed(2)} ₴</div>

                  <button
                    className={`px-3 py-1 rounded-full text-xs border ${p.in_stock ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}
                    onClick={() => toggleStock(p)}
                    title="Перемкнути наявність"
                  >
                    {p.in_stock ? 'В наявності' : 'Немає'}
                  </button>

                  <button className="btn-outline" onClick={() => edit(p)}>Редагувати</button>
                  <button className="btn-ghost" onClick={() => remove(p)}>Видалити</button>
                </div>
              ))}
              {filtered.length === 0 && <div className="text-muted">Нічого не знайдено.</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
