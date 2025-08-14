// src/pages/AdminProducts.jsx
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

/**
 * Адмін • Товари
 * - форма створення/редагування на цій же сторінці (як було)
 * - кнопка "Імпорт товарів" веде на /admin/import (існуючий роут у App.jsx)
 * - "Новий товар" просто скидає форму
 * - видалення: реальний DELETE; якщо блокує FK (23503) — мʼяке приховування: in_stock=false
 */

const BUCKET = 'product-images'

export default function AdminProducts() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  // форма
  const [editingId, setEditingId] = useState(null)
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [mainFile, setMainFile] = useState(null)
  const [galleryFiles, setGalleryFiles] = useState([])
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true); setError('')
    const { data, error } = await supabase
      .from('products')
      .select('id, sku, name, price_dropship, image_url, gallery_json, in_stock')
      .order('created_at', { ascending: false })
      .limit(1000)
    if (error) setError(error.message)
    setRows(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function resetForm() {
    setEditingId(null)
    setSku('')
    setName('')
    setPrice('')
    setDescription('')
    setMainFile(null)
    setGalleryFiles([])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function beginEdit(p) {
    setEditingId(p.id)
    setSku(p.sku || '')
    setName(p.name || '')
    setPrice(String(p.price_dropship ?? ''))
    setDescription(p.description || '')
    setMainFile(null)
    setGalleryFiles([])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function uploadToBucket(file) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
    if (error) throw error
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return pub.publicUrl
  }

  async function saveProduct() {
    if (!name.trim()) { alert('Вкажіть назву'); return }
    const priceNum = Number(price || 0)
    if (Number.isNaN(priceNum) || priceNum < 0) { alert('Некоректна ціна'); return }

    setSaving(true)
    try {
      let mainUrl = null
      let galleryUrls = []

      if (mainFile) {
        mainUrl = await uploadToBucket(mainFile)
      }
      if (galleryFiles.length) {
        const up = []
        for (const f of galleryFiles) up.push(uploadToBucket(f))
        galleryUrls = await Promise.all(up)
      }

      if (editingId) {
        // оновлення
        const patch = {
          sku: sku.trim() || null,
          name: name.trim(),
          price_dropship: priceNum,
          description,
        }
        if (mainUrl) patch.image_url = mainUrl
        if (galleryUrls.length) {
          // додаємо до існуючої галереї
          const cur = rows.find(r => r.id === editingId)?.gallery_json || []
          patch.gallery_json = [...(Array.isArray(cur) ? cur : []), ...galleryUrls]
        }
        const { error: upErr } = await supabase.from('products').update(patch).eq('id', editingId)
        if (upErr) throw upErr
      } else {
        // створення
        const insert = {
          sku: sku.trim() || null,
          name: name.trim(),
          price_dropship: priceNum,
          description,
          image_url: mainUrl,
          gallery_json: galleryUrls,
          in_stock: true,
        }
        const { error: insErr } = await supabase.from('products').insert(insert)
        if (insErr) throw insErr
      }

      await load()
      resetForm()
    } catch (e) {
      alert(`Помилка збереження: ${e.message}`)
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function deleteProduct(p) {
    if (!p?.id) return
    const ok = window.confirm(`Видалити товар "${p.name}"?`)
    if (!ok) return

    const prev = rows
    setRows(prev.filter(r => r.id !== p.id))

    const { error: delErr } = await supabase.from('products').delete().eq('id', p.id)
    if (delErr) {
      // FK (orders → products) блокує видалення
      const msg = (delErr.message || '').toLowerCase()
      const isFK = msg.includes('foreign key constraint') || delErr.code === '23503'
      if (isFK) {
        // мʼяке приховування: ставимо in_stock=false
        const { error: softErr } = await supabase.from('products').update({ in_stock: false }).eq('id', p.id)
        if (softErr) {
          setRows(prev) // повертаємо стан
          alert(`Неможливо видалити. Товар використовується в замовленнях.\n\nСпроба приховати (in_stock=false) також не вдалася: ${softErr.message}`)
          console.error(softErr)
          return
        }
        alert('Товар привʼязаний до замовлень, тому його повністю видалити не можна.\nМи вимкнули його з продажу (in_stock = false).')
        await load()
        return
      }
      // інша помилка
      setRows(prev)
      alert(`Помилка видалення: ${delErr.message}`)
      console.error(delErr)
      return
    }

    // за бажанням: видалення головного фото зі стораджу (не критично)
    try {
      const marker = `/${BUCKET}/`
      const url = p.image_url || ''
      if (url.includes(marker)) {
        const path = decodeURIComponent(url.split(marker)[1] || '')
        if (path) await supabase.storage.from(BUCKET).remove([path])
      }
    } catch { /* ignore */ }
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter(r =>
      (r.name || '').toLowerCase().includes(s) ||
      (r.sku  || '').toLowerCase().includes(s)
    )
  }, [rows, q])

  return (
    <div className="container-page py-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="h1">Адмін • Товари</h1>

        <div className="flex items-center gap-2">
          <Link className="btn-outline" to="/admin/import">Імпорт товарів</Link>
          <button className="btn-primary" type="button" onClick={resetForm}>Новий товар</button>
        </div>
      </div>

      {error && <div className="alert-error mb-3">{error}</div>}

      {/* ФОРМА */}
      <div className="card mb-5">
        <div className="card-body grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Артикул (SKU)</label>
            <input className="input" value={sku} onChange={e=>setSku(e.target.value)} placeholder="ABC-001" />

            <label className="label mt-3">Назва</label>
            <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Назва товару" />

            <label className="label mt-3">Дроп-ціна (грн)</label>
            <input className="input" inputMode="numeric" value={price} onChange={e=>setPrice(e.target.value)} />

            <label className="label mt-3">Опис (HTML/текст)</label>
            <textarea className="input" rows={6} value={description} onChange={e=>setDescription(e.target.value)} placeholder="<p>Опис…</p>" />
          </div>

          <div>
            <label className="label">Головне фото</label>
            <input type="file" accept="image/*" onChange={e=>setMainFile(e.target.files?.[0] || null)} />

            <label className="label mt-3">Галерея (можна кілька)</label>
            <input type="file" multiple accept="image/*" onChange={e=>setGalleryFiles(Array.from(e.target.files || []))} />

            <div className="mt-4">
              <button
                type="button"
                className="btn-primary"
                onClick={saveProduct}
                disabled={saving}
              >
                {editingId ? 'Зберегти зміни' : 'Створити'}
              </button>
              {editingId && (
                <button type="button" className="btn-ghost ml-2" onClick={resetForm}>Скасувати</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Список */}
      <div className="mb-3 flex items-center gap-2">
        <input
          className="input w-full sm:w-80"
          placeholder="Пошук по назві або SKU…"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
        />
        <button className="btn-ghost" onClick={load}>Оновити</button>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-muted">Завантаження…</div>
          ) : filtered.length === 0 ? (
            <div className="text-muted">Нічого не знайдено.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map(p => (
                <div key={p.id} className="flex items-center gap-3 border rounded-xl px-3 py-2">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 flex-none">
                    {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : null}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.name || 'Без назви'}</div>
                    <div className="text-sm text-muted truncate">
                      SKU: {p.sku || '—'} • {Number(p.price_dropship||0).toFixed(2)} ₴ • {p.in_stock ? 'в наявності' : 'вимкнено'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="btn-outline" onClick={() => beginEdit(p)}>Редагувати</button>
                    <button className="btn-ghost text-red-600" onClick={() => deleteProduct(p)}>Видалити</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
