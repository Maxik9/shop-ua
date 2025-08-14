import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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

export default function AdminProductEditor() {
  const { id: paramId } = useParams()
  const isNew = !paramId || paramId === 'new'
  const nav = useNavigate()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  // form state
  const [id, setId] = useState(null)
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [inStock, setInStock] = useState(true)
  const [categoryId, setCategoryId] = useState('')
  const [desc, setDesc] = useState('')
  const [mainUrl, setMainUrl] = useState('')
  const [gallery, setGallery] = useState([])

  const mainInputRef = useRef(null)
  const galleryInputRef = useRef(null)

  useEffect(() => {
    if (isNew) return
    ;(async () => {
      setLoading(true); setErr('')
      const { data, error } = await supabase.from('products').select('*').eq('id', paramId).maybeSingle()
      if (error) setErr(error.message || 'Помилка завантаження')
      if (data) {
        setId(data.id)
        setSku(data.sku || '')
        setName(data.name || '')
        setPrice(String(data.price_dropship ?? data.price ?? ''))
        setInStock(!!data.in_stock)
        setCategoryId(String(data.category_id ?? ''))
        setDesc(data.description || '')
        setMainUrl(data.image_url || '')
        setGallery(Array.isArray(data.gallery_json) ? data.gallery_json : (data.gallery_json ? [].concat(data.gallery_json) : []))
      }
      setLoading(false)
    })()
  }, [paramId, isNew])

  function resetForm() {
    setId(null); setSku(''); setName(''); setPrice(''); setInStock(true); setCategoryId('')
    setDesc(''); setMainUrl(''); setGallery([]); setMsg(''); setErr('')
  }

  async function handleSave() {
    try {
      setSaving(true); setMsg(''); setErr('')
      const row = {
        sku: sku.trim(),
        name: name.trim(),
        price_dropship: Number(price) || 0,
        in_stock: !!inStock,
        category_id: categoryId ? Number(categoryId) : null,
        description: desc || '',
        image_url: mainUrl || null,
        gallery_json: gallery?.length ? gallery : null,
      }
      let res
      if (isNew) res = await supabase.from('products').insert(row).select().maybeSingle()
      else res = await supabase.from('products').update(row).eq('id', paramId).select().maybeSingle()
      if (res.error) throw res.error
      setMsg('Збережено')
      if (isNew && res.data?.id) {
        nav(`/admin/products/${res.data.id}`, { replace: true })
      }
    } catch (e) {
      setErr(e.message || 'Помилка збереження')
    } finally {
      setSaving(false)
    }
  }

  async function onUploadMain(e) {
    const f = e.target.files?.[0]; if (!f) return
    try { const url = await uploadToBucket(f); setMainUrl(url) } catch (e) { alert(e.message) }
    finally { if (mainInputRef.current) mainInputRef.current.value = '' }
  }

  async function onUploadGallery(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    try {
      const uploaded = []
      for (const f of files) uploaded.push(await uploadToBucket(f))
      setGallery(prev => [...prev, ...uploaded])
    } catch (e) {
      alert(e.message)
    } finally {
      if (galleryInputRef.current) galleryInputRef.current.value = ''
    }
  }

  function removeGallery(idx) { setGallery(prev => prev.filter((_, i) => i !== idx)) }
  function setAsMain(idx) {
    setMainUrl(gallery[idx])
    setGallery(prev => prev.filter((_, i) => i !== idx))
  }
  function addUrlToGallery() {
    const u = prompt('Вставте URL зображення')
    if (u && u.trim()) setGallery(prev => [...prev, u.trim()])
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">{isNew ? 'Новий товар' : 'Редагування товару'}</h1>
        <div className="flex gap-2">
          <button className="btn-primary" disabled={saving} onClick={handleSave}>{saving ? 'Збереження…' : 'Зберегти'}</button>
          <Link to="/admin/products" className="btn-ghost">← До списку</Link>
        </div>
      </div>

      {err && <div className="mb-3 text-red-600 text-sm">Помилка: {err}</div>}
      {loading ? <div className="text-muted">Завантаження…</div> : (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <div className="card-body">
              <label className="label">Назва позиції</label>
              <input className="input" value={name} onChange={e=>setName(e.target.value)} />

              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="label">Код/Артикул (SKU)</label>
                  <input className="input" value={sku} onChange={e=>setSku(e.target.value)} />
                </div>
                <div>
                  <label className="label">Категорія (ID, опц.)</label>
                  <input className="input" value={categoryId} onChange={e=>setCategoryId(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="label">Ціна (грн)</label>
                  <input className="input" type="number" value={price} onChange={e=>setPrice(e.target.value)} />
                </div>
                <div>
                  <label className="label">Наявність</label>
                  <select className="input" value={inStock ? '1' : '0'} onChange={e=>setInStock(e.target.value === '1')}>
                    <option value="1">В наявності</option>
                    <option value="0">Немає</option>
                  </select>
                </div>
              </div>

              <label className="label mt-4">Опис (HTML)</label>
              <textarea className="input min-h-[220px] font-mono" placeholder="HTML опис…" value={desc} onChange={e=>setDesc(e.target.value)} />
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <label className="label">Головне фото</label>
              <div className="flex items-center gap-3">
                <div className="w-28 h-28 bg-slate-100 rounded overflow-hidden flex items-center justify-center">
                  {mainUrl ? <img src={mainUrl} alt="main" className="object-cover w-full h-full" /> : <span className="text-xs text-slate-400">нема</span>}
                </div>
                <div className="flex flex-col gap-2">
                  <input ref={mainInputRef} type="file" accept="image/*" onChange={onUploadMain} />
                  <input className="input" placeholder="Або встав URL…" onKeyDown={e => { if (e.key === 'Enter') { setMainUrl(e.currentTarget.value.trim()); e.currentTarget.value=''; } }} />
                </div>
              </div>

              <label className="label mt-4">Галерея (до 10)</label>
              <div className="grid grid-cols-5 gap-2">
                {gallery.map((u, i) => (
                  <div key={i} className="relative group">
                    <img src={u} alt={String(i)} className="w-full h-20 object-cover rounded" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                      <button className="btn-ghost text-white text-xs" onClick={() => setAsMain(i)}>Зробити головним</button>
                      <button className="btn-ghost text-white text-xs" onClick={() => removeGallery(i)}>×</button>
                    </div>
                  </div>
                ))}
                {gallery.length < 10 && (
                  <div className="border rounded flex items-center justify-center h-20">
                    <button className="btn-ghost" onClick={() => galleryInputRef.current?.click()}>+ Додати</button>
                  </div>
                )}
              </div>
              <input ref={galleryInputRef} type="file" multiple accept="image/*" className="hidden" onChange={onUploadGallery} />
              <button className="btn-ghost mt-2" onClick={addUrlToGallery}>+ Додати по URL</button>

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
        </div>
      )}
    </div>
  )
}
