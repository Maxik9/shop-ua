// src/pages/AdminProductEditor.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import RichEditor from '../components/RichEditor'

export default function AdminProductEditor() {
  const { id } = useParams() // 'new' або uuid
  const navigate = useNavigate()

  // --- форми ---
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('') // як текст у інпуті
  const [inStock, setInStock] = useState(true)
  const [categoryId, setCategoryId] = useState('')
  const [sizes, setSizes] = useState('')              // <-- НОВЕ поле

  const [imageUrl, setImageUrl] = useState('')
  const [gallery, setGallery] = useState([])          // масив URL
  const [descHtml, setDescHtml] = useState('')

  // --- допоміжне ---
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState([])

  // зручний плейсхолдер
  const isNew = id === 'new'

  // завантажити категорії + товар (якщо редагування)
  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true); setError('')

      try {
        // Категорії
        const { data: cats, error: ce } = await supabase
          .from('categories')
          .select('id, name')
          .order('name', { ascending: true })
        if (ce) throw ce
        if (alive) setCategories(cats || [])

        // Якщо створення — заповнимо дефолти і вийдемо
        if (isNew) {
          if (alive) setLoading(false)
          return
        }

        // Завантажити товар
        const { data, error: pe } = await supabase
          .from('products')
          .select('id, sku, name, description, price_dropship, image_url, gallery_json, in_stock, category_id, sizes')
          .eq('id', id)
          .single()
        if (pe) throw pe
        if (!data) throw new Error('Товар не знайдено')

        if (alive) {
          setSku(data.sku || '')
          setName(data.name || '')
          setPrice(
            data.price_dropship === null || data.price_dropship === undefined
              ? ''
              : String(Number(data.price_dropship))
          )
          setInStock(!!data.in_stock)
          setCategoryId(data.category_id || '')
          setDescHtml(data.description || '')
          setImageUrl(data.image_url || '')
          setGallery(Array.isArray(data.gallery_json) ? data.gallery_json.filter(Boolean) : [])
          setSizes(data.sizes || '') // <-- НОВЕ
        }
      } catch (e) {
        if (alive) setError(e.message || 'Помилка завантаження')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [id, isNew])

  // перетворення текстового списку в масив URL для галереї
  const galleryText = useMemo(() => (gallery || []).join('\n'), [gallery])
  const setGalleryText = (val) => {
    // дозволимо вводити через новий рядок або через кому
    const arr = (val || '')
      .split(/\n|,/)
      .map(s => s.trim())
      .filter(Boolean)
    setGallery(arr)
  }

  // валідація (мінімальна)
  const canSave = useMemo(() => {
    if (!name.trim()) return false
    const p = Number(price)
    if (Number.isNaN(p) || p < 0) return false
    return true
  }, [name, price])

  async function handleSave() {
    if (!canSave) return

    setSaving(true); setError('')
    try {
      const p = Number(price) || 0
      const row = {
        sku: sku.trim() || null,
        name: name.trim(),
        price_dropship: p,
        in_stock: !!inStock,
        category_id: categoryId || null,
        description: (descHtml || '').trim() || null,
        image_url: imageUrl.trim() || null,
        gallery_json: gallery && gallery.length ? gallery : [],
        sizes: sizes.trim() || null, // <-- НОВЕ: зберігаємо як text
        updated_at: new Date().toISOString(),
      }

      if (isNew) {
        const { data, error: ie } = await supabase
          .from('products')
          .insert(row)
          .select('id')
          .single()
        if (ie) throw ie
        navigate(`/admin/products/${data.id}`)
      } else {
        const { error: ue } = await supabase
          .from('products')
          .update(row)
          .eq('id', id)
        if (ue) throw ue
      }

      navigate('/admin/products')
    } catch (e) {
      setError(e.message || 'Не вдалося зберегти')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container-page mt-header">
      <div className="flex items-center justify-between mb-4">
        <h1 className="h1">{isNew ? 'Новий товар' : 'Редагувати товар'}</h1>
        <div className="flex gap-2">
          <Link to="/admin/products" className="btn-outline">Скасувати</Link>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving || !canSave}
          >
            {saving ? 'Збереження…' : 'Зберегти'}
          </button>
        </div>
      </div>

      {error && (
        <div className="card mb-4">
          <div className="card-body">
            <div className="alert alert-error">{error}</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card"><div className="card-body">Завантаження…</div></div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Основні поля */}
          <div className="card">
            <div className="card-body">
              <label className="label">SKU (необовʼязково)</label>
              <input
                className="input"
                value={sku}
                onChange={e => setSku(e.target.value)}
              />

              <label className="label mt-3">Назва</label>
              <input
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="label">Ціна дропшипера, ₴</label>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Наявність</label>
                  <div className="flex items-center gap-2 h-[42px]">
                    <input
                      id="inStock"
                      type="checkbox"
                      className="checkbox"
                      checked={inStock}
                      onChange={e => setInStock(e.target.checked)}
                    />
                    <label htmlFor="inStock" className="select-none">В наявності</label>
                  </div>
                </div>
              </div>

              <label className="label mt-3">Категорія</label>
              <select
                className="input"
                value={categoryId || ''}
                onChange={e => setCategoryId(e.target.value)}
              >
                <option value="">— Без категорії —</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* НОВЕ поле Розміри */}
              <div className="mt-3">
                <label className="label">Розміри (через кому або | )</label>
                <input
                  className="input"
                  value={sizes}
                  onChange={e => setSizes(e.target.value)}
                  placeholder="Напр.: S,M,L або 38|39|40|41"
                />
                <div className="text-muted text-sm mt-1">
                  Це звичайний текст. На сторінці товару зʼявиться селектор, де клієнт обирає розмір.
                </div>
              </div>

              <label className="label mt-3">Головне фото (URL)</label>
              <input
                className="input"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="https://…"
              />

              <label className="label mt-3">Галерея (по одному URL в рядок або через кому)</label>
              <textarea
                className="input"
                rows="4"
                value={galleryText}
                onChange={e => setGalleryText(e.target.value)}
                placeholder="https://…\nhttps://…"
              />
            </div>
          </div>

          {/* Опис */}
          <div className="card">
            <div className="card-body">
              <label className="label">Опис (HTML)</label>
              <RichEditor value={descHtml} onChange={setDescHtml} />

              <div className="text-sm text-muted mt-2">
                У редакторі можна центрувати зображення та робити списки. Зберігається як HTML.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
