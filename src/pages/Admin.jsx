import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Admin() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [catFilter, setCatFilter] = useState('all')

  // форма
  const emptyForm = {
    id: null,
    name: '',
    description: '',
    category_id: null,
    price_dropship: '',
    image_url: '',
    gallery_json: []
  }
  const [form, setForm] = useState(emptyForm)
  const [mainFile, setMainFile] = useState(null)
  const [galleryFiles, setGalleryFiles] = useState([])

  useEffect(() => { loadAll() }, [])
  async function loadAll() {
    setLoading(true)
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('products').select('*').order('created_at', { ascending: false }),
    ])
    setCategories(cats || [])
    setProducts(prods || [])
    setLoading(false)
  }

  const list = useMemo(() => {
    let arr = products
    if (catFilter !== 'all') arr = arr.filter(p => p.category_id === catFilter)
    if (q.trim()) {
      const t = q.toLowerCase()
      arr = arr.filter(p => (p.name || '').toLowerCase().includes(t))
    }
    return arr
  }, [products, q, catFilter])

  function startCreate() {
    setForm(emptyForm)
    setMainFile(null)
    setGalleryFiles([])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function startEdit(p) {
    setForm({
      id: p.id,
      name: p.name || '',
      description: p.description || '',
      category_id: p.category_id || null,
      price_dropship: p.price_dropship ?? '',
      image_url: p.image_url || '',
      gallery_json: Array.isArray(p.gallery_json) ? p.gallery_json : []
    })
    setMainFile(null)
    setGalleryFiles([])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function ensureBucket() {
    // Нічого робити не треба якщо вже існує
    // (Supabase не має простого SDK-методу "create if not exists" з клієнта)
    return 'product-images'
  }

  async function uploadToStorage(file) {
    if (!file) return null
    const bucket = await ensureBucket()
    const ext = file.name.split('.').pop()
    const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false })
    if (error) throw error
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  async function save() {
    if (!form.name || !form.price_dropship) {
      alert('Назва та дроп-ціна — обов’язкові')
      return
    }
    setLoading(true)
    try {
      let image_url = form.image_url
      if (mainFile) {
        image_url = await uploadToStorage(mainFile)
      }
      let gallery = Array.isArray(form.gallery_json) ? [...form.gallery_json] : []
      if (galleryFiles.length) {
        const uploaded = []
        for (const f of galleryFiles) uploaded.push(await uploadToStorage(f))
        gallery = [...gallery, ...uploaded]
      }

      const payload = {
        name: form.name,
        description: form.description || null,
        category_id: form.category_id || null,
        price_dropship: Number(form.price_dropship),
        image_url: image_url || null,
        gallery_json: gallery
      }

      if (form.id) {
        await supabase.from('products').update(payload).eq('id', form.id)
      } else {
        await supabase.from('products').insert(payload)
      }

      await loadAll()
      setForm(emptyForm)
      setMainFile(null)
      setGalleryFiles([])
      alert('Збережено ✅')
    } catch (e) {
      console.error(e)
      alert(e.message || 'Помилка')
    } finally {
      setLoading(false)
    }
  }

  async function del(id) {
    if (!window.confirm('Видалити товар?')) return
    await supabase.from('products').delete().eq('id', id)
    setProducts(products.filter(p => p.id !== id))
  }

  async function quickAddCategory() {
    const name = window.prompt('Нова категорія (назва):')
    if (!name) return
    const { data, error } = await supabase.from('categories').insert({ name }).select().single()
    if (!error && data) {
      setCategories([...(categories || []), data])
      setForm(f => ({ ...f, category_id: data.id }))
    }
  }

  function removeGalleryImage(idx) {
    setForm(f => ({ ...f, gallery_json: f.gallery_json.filter((_, i) => i !== idx) }))
  }
  function moveGallery(idx, dir) {
    setForm(f => {
      const arr = [...(f.gallery_json || [])]
      const j = idx + dir
      if (j < 0 || j >= arr.length) return f
      ;[arr[idx], arr[j]] = [arr[j], arr[idx]]
      return { ...f, gallery_json: arr }
    })
  }

  return (
    <div className="container-page my-6">
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h1 className="h1">Адмін • Товари</h1>
            <div className="flex gap-2">
              <button className="btn-outline" onClick={startCreate}>Новий товар</button>
              <button className="btn-ghost" onClick={quickAddCategory}>+ Категорія</button>
            </div>
          </div>

          {/* форма */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <div className="text-sm text-muted mb-1">Назва</div>
                <input className="input" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} placeholder="Назва товару" />
              </div>
              <div>
                <div className="text-sm text-muted mb-1">Категорія</div>
                <select className="input" value={form.category_id ?? ''} onChange={e=>setForm({...form, category_id: e.target.value || null})}>
                  <option value="">— без категорії —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <div className="text-sm text-muted mb-1">Дроп-ціна (грн)</div>
                <input className="input" type="number" value={form.price_dropship} onChange={e=>setForm({...form, price_dropship:e.target.value})} placeholder="0" />
              </div>
              <div>
                <div className="text-sm text-muted mb-1">Опис</div>
                <textarea className="input" rows={6} value={form.description} onChange={e=>setForm({...form, description:e.target.value})} placeholder="Опис товару"></textarea>
              </div>
            </div>

            <div className="space-y-4">
              {/* Головне фото */}
              <div>
                <div className="text-sm text-muted mb-1">Головне фото</div>
                {form.image_url && (
                  <div className="mb-2 w-full aspect-[4/3] bg-slate-100 rounded-xl overflow-hidden">
                    <img src={form.image_url} alt="" className="w-full h-full object-contain" />
                  </div>
                )}
                <input className="input" type="file" accept="image/*" onChange={e=>setMainFile(e.target.files?.[0] || null)} />
              </div>

              {/* Галерея */}
              <div>
                <div className="text-sm text-muted mb-1">Галерея (можна кілька)</div>
                {Array.isArray(form.gallery_json) && form.gallery_json.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.gallery_json.map((src, idx) => (
                      <div key={idx} className="relative">
                        <div className="w-[96px] h-[96px] overflow-hidden rounded-xl bg-slate-100 border border-slate-200">
                          <img src={src} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute -top-2 -right-2 flex gap-1">
                          <button className="btn-ghost input-xs" onClick={()=>moveGallery(idx,-1)}>↑</button>
                          <button className="btn-ghost input-xs" onClick={()=>moveGallery(idx,+1)}>↓</button>
                          <button className="btn-outline input-xs" onClick={()=>removeGalleryImage(idx)}>×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <input className="input" type="file" accept="image/*" multiple onChange={e=>setGalleryFiles(Array.from(e.target.files || []))} />
              </div>

              <div className="flex gap-2">
                <button className="btn-primary" onClick={save} disabled={loading}>{form.id ? 'Зберегти' : 'Створити'}</button>
                {form.id && <button className="btn-outline" onClick={()=>{ setForm(emptyForm); setMainFile(null); setGalleryFiles([]) }}>Скасувати</button>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* список */}
      <div className="card mt-6">
        <div className="card-body">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <input className="input input-xs w-[260px]" placeholder="Пошук по назві…" value={q} onChange={e=>setQ(e.target.value)} />
            <select className="input input-xs w-[220px]" value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
              <option value="all">Усі категорії</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="ml-auto text-muted text-sm">{list.length} товар(ів)</div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-[14px]">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Товар</th>
                  <th className="py-2 pr-3">Категорія</th>
                  <th className="py-2 pr-3">Дроп-ціна</th>
                  <th className="py-2 pr-3 w-[160px]">Дії</th>
                </tr>
              </thead>
              <tbody>
                {list.map(p => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100">
                          {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="font-medium">{p.name}</div>
                      </div>
                    </td>
                    <td className="py-3 pr-3">{categories.find(c=>c.id===p.category_id)?.name || <span className="text-muted">—</span>}</td>
                    <td className="py-3 pr-3">{Number(p.price_dropship).toFixed(2)} ₴</td>
                    <td className="py-3 pr-3">
                      <div className="flex gap-2">
                        <button className="btn-outline input-xs" onClick={()=>startEdit(p)}>Редагувати</button>
                        <button className="btn-ghost input-xs" onClick={()=>del(p.id)}>Видалити</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {list.length===0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-muted">Порожньо</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
