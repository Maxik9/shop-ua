
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import HtmlContent from '../components/HtmlContent'

function uid() { return Date.now() + '-' + Math.random().toString(36).slice(2, 8) }
async function uploadToBucket(file, folder='products') {
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
  return html.replace(/<[^>]*>/g, ' ')
}
function textToHtml(txt) {
  if (!txt) return ''
  const esc = txt.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  return esc.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g,'<br/>')}</p>`).join('')
}

export default function AdminProductEditor() {
  const { id: paramId } = useParams()
  const isNew = !paramId || paramId === 'new'
  const nav = useNavigate()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  // form
  const [id, setId] = useState(null)
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [inStock, setInStock] = useState(true)

  // categories
  const [categories, setCategories] = useState([])
  const [categoryId, setCategoryId] = useState('')

  // desc toggle
  const [descMode, setDescMode] = useState('html')
  const [descHtml, setDescHtml] = useState('')
  const [descText, setDescText] = useState('')

  // images (first === main)
  const [gallery, setGallery] = useState([])
  const dragIndex = useRef(-1)

  const mainInputRef = useRef(null)
  const galleryInputRef = useRef(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('categories').select('id,name').order('name')
      setCategories(data || [])
    })()
  }, [])

  useEffect(() => {
    if (isNew) return
    ;(async () => {
      setLoading(true); setErr('')
      const { data, error } = await supabase.from('products').select('*').eq('id', paramId).single()
      if (error) setErr(error.message || 'Помилка завантаження')
      if (data) {
        setId(data.id); setSku(data.sku || ''); setName(data.name || '')
        setPrice(String(data.price_dropship ?? data.price ?? ''))
        setInStock(!!data.in_stock); setCategoryId(String(data.category_id ?? ''))
        setDescHtml(data.description || ''); setDescText(stripHtmlToText(data.description || ''))
        const arr = []; if (data.image_url) arr.push(data.image_url)
        const rest = Array.isArray(data.gallery_json) ? data.gallery_json : (data.gallery_json ? [data.gallery_json] : [])
        for (const u of rest) if (!arr.includes(u)) arr.push(u)
        setGallery(arr)
      }
      setLoading(false)
    })()
  }, [paramId, isNew])

  async function handleSave(){
    try{
      setSaving(true); setMsg(''); setErr('')
      const descToSave = descMode==='html' ? descHtml : textToHtml(descText)
      const row = {
        sku: sku.trim(),
        name: name.trim(),
        price_dropship: Number(price) || 0,
        in_stock: !!inStock,
        // ключова правка: НЕ кастимо до Number — у вас UUID/текст
        category_id: categoryId ? categoryId : null,
        description: descToSave || '',
        image_url: gallery[0] || null,
        gallery_json: gallery.length ? gallery : null,
      }
      let res
      if (isNew) res = await supabase.from('products').insert(row).select().single()
      else res = await supabase.from('products').update(row).eq('id', paramId).select().single()
      if (res.error) throw res.error
      setMsg('Збережено')
      if (isNew && res.data?.id) nav(`/admin/products/${res.data.id}`, { replace: true })
    }catch(e){ setErr(e.message || 'Помилка збереження') }
    finally{ setSaving(false) }
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
      {/* Уся інша верстка з v4 без змін */}
    </div>
  )
}
