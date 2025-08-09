// src/pages/Admin.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'

export default function Admin() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(null) // null | true | false
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)

  // поля форми
  const emptyForm = { id: null, name: '', description: '', image_url: '', price_dropship: '' }
  const [form, setForm] = useState(emptyForm)

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
      .select('*')
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

    let error
    if (form.id) {
      // UPDATE
      ;({ error } = await supabase.from('products').update(payload).eq('id', form.id))
    } else {
      // INSERT
      ;({ error } = await supabase.from('products').insert(payload))
    }

    setLoading(false)
    if (error) {
      alert('Помилка збереження: ' + error.message)
      return
    }
    setForm(emptyForm)
    await loadProducts()
  }

  function onEdit(p) {
    setForm({
      id: p.id,
      name: p.name ?? '',
      description: p.description ?? '',
      image_url: p.image_url ?? '',
      price_dropship: String(p.price_dropship ?? ''),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function onDelete(p) {
    if (!confirm(`Видалити товар: «${p.name}»?`)) return
    const { error } = await supabase.from('products').delete().eq('id', p.id)
    if (error) {
      alert('Помилка видалення: ' + error.message)
      return
    }
    setProducts(prev => prev.filter(x => x.id !== p.id))
    if (form.id === p.id) setForm(emptyForm)
  }

  if (isAdmin === null) {
    return <p style={{ padding: 24 }}>Перевірка доступу…</p>
  }
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
        <input
          name="name"
          placeholder="Назва *"
          value={form.name}
          onChange={onChange}
          required
        />
        <textarea
          name="description"
          placeholder="Опис (необов’язково)"
          value={form.description}
          onChange={onChange}
          rows={3}
        />
        <input
          name="image_url"
          placeholder="URL зображення (необов’язково)"
          value={form.image_url}
          onChange={onChange}
        />
        <input
          name="price_dropship"
          placeholder="Дроп-ціна (грн) *"
          type="number"
          step="0.01"
          min="0"
          value={form.price_dropship}
          onChange={onChange}
          required
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={loading}>
            {form.id ? 'Оновити' : 'Додати'}
          </button>
          {form.id && (
            <button type="button" onClick={() => setForm(emptyForm)}>
              Скасувати редагування
            </button>
          )}
        </div>
      </form>

      <h3 style={{ marginBottom: 12 }}>Список товарів</h3>
      {loading && products.length === 0 ? <p>Завантаження…</p> : null}
      <div style={{ display: 'grid', gap: 12 }}>
        {products.map(p => (
          <div
            key={p.id}
            style={{
              border: '1px solid #eee',
              borderRadius: 8,
              padding: 12,
              display: 'grid',
              gridTemplateColumns: '100px 1fr auto',
              gap: 12,
              alignItems: 'center',
            }}
          >
            {p.image_url ? (
              <img
                src={p.image_url}
                alt={p.name}
                style={{ width: 100, height: 80, objectFit: 'cover', borderRadius: 6 }}
              />
            ) : (
              <div style={{ width: 100, height: 80, background: '#f5f5f5', borderRadius: 6 }} />
            )}
            <div>
              <div style={{ fontWeight: 600 }}>{p.name}</div>
              {p.description && (
                <div style={{ color: '#666', fontSize: 14, marginTop: 4 }}>{p.description}</div>
              )}
              <div style={{ marginTop: 6 }}>
                Дроп-ціна: <b>{Number(p.price_dropship).toFixed(2)} ₴</b>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => onEdit(p)}>Редагувати</button>
              <button onClick={() => onDelete(p)} style={{ background: '#ffe8e8' }}>
                Видалити
              </button>
            </div>
          </div>
        ))}
        {products.length === 0 && !loading && <p>Ще немає товарів.</p>}
      </div>
    </div>
  )
}