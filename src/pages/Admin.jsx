import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'

const BUCKET = 'product-images'

export default function Admin() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)

  const emptyForm = { id: null, name: '', description: '', image_url: '', price_dropship: '' }
  const [form, setForm] = useState(emptyForm)

  // для файлов
  const fileInputRef = useRef(null)

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession()
      const u = data.session?.user ?? null
      setUser(u)
      if (u) {
        const { data: ok } = await supabase.rpc('is_admin', { u: u.id })
        setIsAdmin(Boolean(ok))
        if (ok) loadProducts()
      } else {
        setIsAdmin(false)
      }
    }
    init()
    const sub = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null
      setUser(u)
    })
    return () => sub.data.subscription.unsubscribe()
  }, [])

  async function loadProducts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*, product_images(* )') // заберём и картинки в один запрос
      .order('created_at', { ascending: false })
    if (!error) setProducts(data || [])
    setLoading(false)
  }

  function onChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function onSave(e) {
    e.preventDefault()
    if (!form.name || !form.price_dropship) return
    setLoading(true)

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
      price_dropship: Number(form.price_dropship),
    }

    let error, newId = form.id
    if (form.id) {
      // UPDATE товара
      ;({ error } = await supabase.from('products').update(payload).eq('id', form.id))
    } else {
      // INSERT товара с возвратом id
      const { data, error: insErr } = await supabase.from('products').insert(payload).select('id').single()
      error = insErr
      newId = data?.id || null
    }

    if (error) {
      setLoading(false)
      alert('Помилка збереження: ' + error.message)
      return
    }

    // Если выбраны файлы — зальём их в Storage и запишем ссылки
    const files = fileInputRef.current?.files
    if (files && files.length && newId) {
      await uploadImagesAndLink(newId, files)
      // если у товара не было обложки, поставим первой картинкой
      if (!form.image_url) {
        const first = await getFirstImageUrl(newId)
        if (first) {
          await supabase.from('products').update({ image_url: first }).eq('id', newId)
        }
      }
    }

    setForm(emptyForm)
    if (fileInputRef.current) fileInputRef.current.value = ''
    await loadProducts()
    setLoading(false)
  }

  async function uploadImagesAndLink(productId, fileList) {
    for (const file of fileList) {
      const ext = file.name.split('.').pop()
      const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })
      if (upErr) { console.warn('upload error', upErr); continue }

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
      const url = pub?.publicUrl
      if (url) {
        await supabase.from('product_images').insert({ product_id: productId, url })
      }
    }
  }

  async function getFirstImageUrl(productId) {
    const { data } = await supabase
      .from('product_images')
      .select('url')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    return data?.url || null
  }

  function onEdit(p) {
    setForm({
      id: p.id,
      name: p.name ?? '',
      description: p.description ?? '',
      image_url: p.image_url ?? '',
      price_dropship: String(p.price_dropship ?? ''),
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function onDelete(p) {
    if (!confirm(`Видалити товар: «${p.name}»?`)) return
    const { error } = await supabase.from('products').delete().eq('id', p.id)
    if (error) { alert('Помилка видалення: ' + error.message); return }
    setProducts(prev => prev.filter(x => x.id !== p.id))
    if (form.id === p.id) setForm(emptyForm)
  }

  async function deleteImage(imgId, productId) {
    // удаляем запись; (файл можно тоже удалить при желании, если хранить путь)
    const { error } = await supabase.from('product_images').delete().eq('id', imgId)
    if (error) { alert('Помилка видалення зображення: ' + error.message); return }
    await loadProducts()
  }

  if (isAdmin === null) return <p style={{ padding: 24 }}>Перевірка доступу…</p>
  if (!isAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <p>Доступ лише для адміна.</p>
        <Link to="/">На головну</Link>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 12 }}>{form.id ? 'Редагувати товар' : 'Додати товар'}</h2>
      <form onSubmit={onSave} style={{ display: 'grid', gap: 12, marginBottom: 28 }}>
        <input name="name" placeholder="Назва *" value={form.name} onChange={onChange} required />
        <textarea name="description" placeholder="Опис (необов’язково)" value={form.description} onChange={onChange} rows={3} />
        <input name="image_url" placeholder="Обкладинка (URL, необов’язково)" value={form.image_url} onChange={onChange} />
        <input name="price_dropship" placeholder="Дроп-ціна (грн) *" type="number" step="0.01" min="0" value={form.price_dropship} onChange={onChange} required />

        {/* множественная загрузка картинок */}
        <div>
          <label style={{display:'block', marginBottom:6}}>Додаткові фото (можна кілька):</label>
          <input ref={fileInputRef} type="file" accept="image/*" multiple />
          <small style={{color:'#666'}}>Ці фото збережуться в Storage після збереження товару.</small>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={loading}>{form.id ? 'Оновити' : 'Додати'}</button>
          {form.id && <button type="button" onClick={() => { setForm(emptyForm); if (fileInputRef.current) fileInputRef.current.value='' }}>Скасувати редагування</button>}
        </div>
      </form>

      <h3 style={{ marginBottom: 12 }}>Список товарів</h3>
      {loading && products.length === 0 ? <p>Завантаження…</p> : null}
      <div style={{ display: 'grid', gap: 12 }}>
        {products.map(p => (
          <div key={p.id} style={{border:'1px solid #eee', borderRadius:8, padding:12}}>
            <div style={{display:'grid', gridTemplateColumns:'100px 1fr auto', gap:12, alignItems:'center'}}>
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} style={{ width: 100, height: 80, objectFit: 'cover', borderRadius: 6 }} />
              ) : (
                <div style={{ width: 100, height: 80, background: '#f5f5f5', borderRadius: 6 }} />
              )}
              <div>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                {p.description && <div style={{ color: '#666', fontSize: 14, marginTop: 4 }}>{p.description}</div>}
                <div style={{ marginTop: 6 }}>Дроп-ціна: <b>{Number(p.price_dropship).toFixed(2)} ₴</b></div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => onEdit(p)}>Редагувати</button>
                <button onClick={() => onDelete(p)} style={{ background: '#ffe8e8' }}>Видалити</button>
              </div>
            </div>

            {/* мини-галерея картинок товара */}
            {p.product_images?.length ? (
              <div style={{display:'flex', gap:8, marginTop:12, flexWrap:'wrap'}}>
                {p.product_images.map(img => (
                  <div key={img.id} style={{position:'relative'}}>
                    <img src={img.url} alt="" style={{width:100, height:80, objectFit:'cover', borderRadius:6, border:'1px solid #ddd'}} />
                    <button
                      onClick={() => deleteImage(img.id, p.id)}
                      style={{position:'absolute', top:2, right:2, padding:'2px 6px', fontSize:12, background:'#fff'}}
                      title="Видалити фото"
                    >×</button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {products.length === 0 && !loading && <p>Ще немає товарів.</p>}
      </div>
    </div>
  )
}
