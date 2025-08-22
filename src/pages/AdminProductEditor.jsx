// src/pages/AdminProductEditor.jsx
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import HtmlContent from '../components/HtmlContent'
import RichEditor from '../components/RichEditor'

// ===== helpers =====
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

function stripHtmlToText(html) {
  if (!html) return ''
  if (typeof window !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    return doc.body.textContent || ''
  }
  return html
    .replace(/<[^/]+?>/g, ' ')
    .replace(/<\/[^>]+?>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function textToHtml(txt) {
  return (txt || '')
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('')
}

// ===== component =====
export default function AdminProductEditor() {
  const nav = useNavigate()
  const { id: paramId } = useParams()
  const isNew = !paramId

  const mainInputRef = useRef(null)
  const dragIndex = useRef(-1)

  // messages
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  // form fields
  const [id, setId] = useState(null)
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [inStock, setInStock] = useState(true)
  const [categoryId, setCategoryId] = useState('')

  // NEW: sizes (admin enters list like "S,M,L" or "39|40|41")
  const [sizes, setSizes] = useState('')

  // description
  const [descHtml, setDescHtml] = useState('')
  const [descText, setDescText] = useState('') // лишили, якщо десь використовується

  // categories + gallery
  const [categories, setCategories] = useState([])
  const [gallery, setGallery] = useState([]) // first = main

  useEffect(() => {
    setMsg('')
    setErr('')
  }, [name, price, inStock, categoryId, descHtml, descText, gallery, sizes])

  // load categories
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('categories').select('id, name').order('sort_order')
      setCategories(data || [])
    })()
  }, [])

  // load product
  useEffect(() => {
    if (isNew) return
    ;(async () => {
      setLoading(true)
      setErr('')
      const { data, error } = await supabase.from('products').select('*').eq('id', paramId).single()
      if (error) setErr(error.message || 'Помилка завантаження')
      if (data) {
        setId(data.id)
        setSku(data.sku || '')
        setName(data.name || '')
        setPrice(String(data.price_dropship ?? data.price ?? ''))
        setInStock(!!data.in_stock)
        setCategoryId(data.category_id ? String(data.category_id) : '')
        setDescHtml(data.description || '')
        setDescText(stripHtmlToText(data.description || ''))
        setSizes(data.sizes || '') // NEW

        // merge image_url + gallery_json to a unique array
        const arr = []
        if (data.image_url) arr.push(data.image_url)
        const rest = Array.isArray(data.gallery_json)
          ? data.gallery_json
          : data.gallery_json
          ? [data.gallery_json]
          : []
        for (const u of rest) if (u && !arr.includes(u)) arr.push(u)
        setGallery(arr)
      }
      setLoading(false)
    })()
  }, [paramId, isNew])

  // gallery reorder
  function onDrop(i) {
    const from = dragIndex.current
    if (from === -1 || from === i) return
    setGallery((prev) => {
      const arr = prev.slice()
      const [m] = arr.splice(from, 1)
      arr.splice(i, 0, m)
      return arr
    })
    dragIndex.current = -1
  }

  // uploads
  async function onUploadMain(e) {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const url = await uploadToBucket(f)
      setGallery((prev) => [url, ...prev.filter((x) => x !== url)])
    } catch (e) {
      alert(e.message || 'Помилка завантаження')
    } finally {
      if (mainInputRef.current) mainInputRef.current.value = ''
    }
  }

  async function onUploadGallery(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    try {
      const added = []
      for (const f of files) {
        const url = await uploadToBucket(f)
        if (!added.includes(url)) added.push(url)
      }
      setGallery((prev) => {
        const arr = prev.slice()
        for (const u of added) if (!arr.includes(u)) arr.push(u)
        return arr
      })
    } catch (e) {
      alert(e.message || 'Помилка завантаження')
    } finally {
      e.target.value = ''
    }
  }

  function removeAt(i) {
    setGallery((prev) => prev.filter((_, idx) => idx !== i))
  }

  // save
  async function onSave() {
    try {
      setMsg('')
      setErr('')
      setLoading(true)

      const descToSave = descHtml || textToHtml(descText)
      const row = {
        sku: sku || null,
        name: (name || '').trim(),
        price_dropship: Number((price || '').toString().replace(',', '.')) || 0,
        in_stock: !!inStock,
        category_id: categoryId ? categoryId : null,
        description: descToSave,
        image_url: gallery[0] || null,
        gallery_json: gallery.length ? gallery : null,
        sizes: (sizes || '').trim() || null, // NEW
      }

      let res
      if (isNew) res = await supabase.from('products').insert(row).select().single()
      else res = await supabase.from('products').update(row).eq('id', paramId).select().single()

      if (res.error) throw res.error
      setMsg('Збережено')
      if (isNew) nav('/admin/products')
    } catch (e) {
      setErr(e.message || 'Помилка збереження')
    } finally {
      setLoading(false)
    }
  }

  // UI
  return (
    <div className="container-page mt-header py-4 sm:py-6">
      <div className="mb-4">
        <Link to="/admin/products" className="btn-outline">← Назад до списку</Link>
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-4">
        {/* ===== LEFT: FORM ===== */}
        <div className="card">
          <div className="card-body">
            <label className="label">Назва позиції</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="label">Код/Артикул (SKU)</label>
                <input className="input" value={sku} onChange={(e) => setSku(e.target.value)} />
              </div>
              <div>
                <label className="label">Категорія</label>
                <select
                  className="input"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">— не вибрано —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="label">Ціна (грн)</label>
                <input
                  className="input"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Наявність</label>
                <select
                  className="input"
                  value={inStock ? '1' : '0'}
                  onChange={(e) => setInStock(e.target.value === '1')}
                >
                  <option value="1">В наявності</option>
                  <option value="0">Немає</option>
                </select>
              </div>
            </div>

            {/* NEW: Sizes */}
            <div className="mt-3">
              <label className="label">Розміри (список)</label>
              <input
                className="input"
                placeholder="Напр.: S,M,L або 39|40|41"
                value={sizes}
                onChange={(e) => setSizes(e.target.value)}
              />
              <div className="text-xs text-muted mt-1">
                Розділювачі: кома, крапка з комою або «|». Порядок збережеться.
              </div>
            </div>

            <div className="mt-4">
              <label className="label">Опис</label>
              <RichEditor value={descHtml} onChange={setDescHtml} />
            </div>
          </div>
        </div>

        {/* ===== RIGHT: PHOTOS ===== */}
        <div className="card">
          <div className="card-body">
            <div className="label">Головне фото</div>
            <div className="flex items-center gap-3">
              <div className="w-28 h-28 rounded-xl overflow-hidden bg-slate-100 flex-none">
                {gallery[0] ? (
                  <img src={gallery[0]} className="w-full h-full object-cover" alt="" />
                ) : null}
              </div>
              <div className="flex-1">
                <input ref={mainInputRef} type="file" accept="image/*" onChange={onUploadMain} />
                <div className="text-xs text-muted">Підтримка JPG/PNG/WebP.</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="label">Галерея</div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {gallery.slice(1).map((u, idx) => (
                  <div
                    key={u}
                    className="relative group w-full aspect-square rounded-lg overflow-hidden bg-slate-100"
                    draggable
                    onDragStart={() => {
                      dragIndex.current = idx + 1
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDrop(idx + 1)}
                  >
                    <img src={u} alt="" className="w-full h-full object-cover" />
                    <button
                      className="absolute top-1 right-1 btn-xs bg-white/90 hover:bg-white"
                      onClick={() => removeAt(idx + 1)}
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <label className="border rounded-lg aspect-square grid place-content-center cursor-pointer hover:bg-slate-50">
                  <span className="text-sm">+ Додати</span>
                  <input type="file" multiple accept="image/*" className="hidden" onChange={onUploadGallery} />
                </label>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <input
                  className="input flex-1"
                  placeholder="Вставити URL зображення…"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const u = e.currentTarget.value
                      if (u && u.trim()) setGallery((prev) => [...prev, u.trim()])
                      e.currentTarget.value = ''
                    }
                  }}
                />
                <button
                  className="btn-outline"
                  type="button"
                  onClick={() => {
                    const el = document.querySelector('input[placeholder="Вставити URL зображення…"]')
                    const u = el?.value
                    if (u && u.trim()) setGallery((prev) => [...prev, u.trim()])
                    if (el) el.value = ''
                  }}
                >
                  + Додати по URL
                </button>
              </div>

              {/* Preview */}
              <div className="mt-6">
                <div className="text-sm text-slate-600 mb-2">Превʼю опису (як на сайті)</div>
                <div className="card">
                  <div className="card-body overflow-x-hidden">
                    <HtmlContent html={descHtml || textToHtml(descText)} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div> {/* end RIGHT card */}
      </div> {/* end grid */}

      {/* Footer actions */}
      <div className="lg:col-span-2 flex items-center justify-between mt-4">
        <div className="text-sm text-muted">{err || msg}</div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Link to={`/product/${id}`} className="btn-outline">
              Переглянути
            </Link>
          )}
          <button className="btn-primary" disabled={loading} onClick={onSave}>
            {loading ? 'Збереження…' : 'Зберегти'}
          </button>
        </div>
      </div>
    </div>
  )
}
