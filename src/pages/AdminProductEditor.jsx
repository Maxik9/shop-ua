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

  function onDragStart(i){ dragIndex.current = i }
  function onDrop(i){
    const from = dragIndex.current
    if (from === -1 || from === i) return
    setGallery(prev => { const arr = prev.slice(); const [m]=arr.splice(from,1); arr.splice(i,0,m); return arr })
    dragIndex.current = -1
  }

  async function onUploadMain(e){
    const f = e.target.files?.[0]; if (!f) return
    try{ const url = await uploadToBucket(f); setGallery(prev => [url, ...prev]) } finally { if (mainInputRef.current) mainInputRef.current.value='' }
  }
  async function onUploadGallery(e){
    const files = Array.from(e.target.files || []); if (!files.length) return
    try{
      const ups=[]; for (const f of files) ups.push(await uploadToBucket(f))
      setGallery(prev => [...prev, ...ups])
    } finally { if (galleryInputRef.current) galleryInputRef.current.value='' }
  }
  function addUrlToGallery(){ const u=prompt('Вставте URL'); if (u && u.trim()) setGallery(prev=>[...prev,u.trim()]) }
  function removeGallery(i){ setGallery(prev => prev.filter((_,idx)=>idx!==i)) }

  async function handleSave(){
    try{
      setSaving(true); setMsg(''); setErr('')
      const descToSave = descMode==='html' ? descHtml : textToHtml(descText)
      const row = {
        sku: sku.trim(),
        name: name.trim(),
        price_dropship: Number(price) || 0,
        in_stock: !!inStock,
        category_id: categoryId ? Number(categoryId) : null,
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
                  <label className="label">Категорія</label>
                  <select className="input" value={categoryId} onChange={e=>setCategoryId(e.target.value)}>
                    <option value="">— не вибрано —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
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

              <div className="mt-4">
                <div className="flex items-center gap-3 mb-2">
                  <label className="label m-0">Опис</label>
                  <div className="inline-flex rounded border overflow-hidden">
                    <button className={`px-3 py-1 ${descMode==='html'?'bg-slate-200':''}`} onClick={()=>setDescMode('html')}>HTML</button>
                    <button className={`px-3 py-1 ${descMode==='text'?'bg-slate-200':''}`} onClick={()=>setDescMode('text')}>Звичайний</button>
                  </div>
                </div>
                {descMode==='html'
                  ? <textarea className="input min-h-[220px] font-mono" placeholder="HTML опис…" value={descHtml} onChange={e=>setDescHtml(e.target.value)} />
                  : <textarea className="input min-h-[220px]" placeholder="Звичайний текст…" value={descText} onChange={e=>setDescText(e.target.value)} />
                }
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <label className="label">Головне фото</label>
              <div className="flex items-center gap-3">
                <div className="w-28 h-28 bg-slate-100 rounded overflow-hidden flex items-center justify-center">
                  {gallery[0] ? <img src={gallery[0]} alt="main" className="object-cover w-full h-full" /> : <span className="text-xs text-slate-400">нема</span>}
                </div>
                <div className="flex flex-col gap-2">
                  <input ref={mainInputRef} type="file" accept="image/*" onChange={async (e)=>{ const f=e.target.files?.[0]; if(!f) return; try{ const url=await uploadToBucket(f); setGallery(prev=>[url,...prev]); } finally { if (mainInputRef.current) mainInputRef.current.value='' } }} />
                  <input className="input" placeholder="Або встав URL…" onKeyDown={e=>{ if(e.key==='Enter'){ const u=e.currentTarget.value.trim(); if(u) setGallery(prev=>[u,...prev]); e.currentTarget.value=''; } }} />
                </div>
              </div>

              <label className="label mt-4">Галерея (перетягни, перший — головний)</label>
              <div className="grid grid-cols-5 gap-2">
                {gallery.map((u, i) => (
                  <div key={i} className="relative group cursor-move" draggable onDragStart={()=>{ dragIndex.current=i }} onDragOver={(e)=>e.preventDefault()} onDrop={()=>{ const from=dragIndex.current; if(from===-1||from===i) return; setGallery(prev=>{const arr=prev.slice(); const [m]=arr.splice(from,1); arr.splice(i,0,m); return arr}) }}>
                    <img src={u} alt={String(i)} className="w-full h-20 object-cover rounded" />
                    {i===0 && <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1 rounded">ГОЛОВНЕ</div>}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                      <button className="btn-ghost text-white text-xs" onClick={(e)=>{ e.preventDefault(); setGallery(prev=>prev.filter((_,idx)=>idx!==i)) }}>×</button>
                    </div>
                  </div>
                ))}
                <div className="border rounded flex items-center justify-center h-20">
                  <button className="btn-ghost" onClick={()=>galleryInputRef.current?.click()}>+ Додати</button>
                </div>
              </div>
              <input ref={galleryInputRef} type="file" multiple accept="image/*" className="hidden" onChange={async (e)=>{ const files=Array.from(e.target.files||[]); if(!files.length) return; const ups=[]; for(const f of files) ups.push(await uploadToBucket(f)); setGallery(prev=>[...prev, ...ups]); }} />
              <button className="btn-ghost mt-2" onClick={()=>{ const u=prompt('Вставте URL'); if(u&&u.trim()) setGallery(prev=>[...prev,u.trim()]) }}>+ Додати по URL</button>

              <div className="mt-6">
                <div className="text-sm text-slate-600 mb-2">Превʼю опису (як на сайті)</div>
                <div className="card"><div className="card-body overflow-x-hidden">
                  <HtmlContent html={descMode==='html' ? descHtml : textToHtml(descText)} />
                </div></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
