// src/pages/AdminCategories.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/(^-+|-+$)/g, '')
    || 'cat-' + Math.random().toString(36).slice(2,7)
}

export default function AdminCategories() {
  const [cats, setCats] = useState([])
  const [name, setName] = useState('')
  const [parent, setParent] = useState('') // id або ''
  const [image, setImage] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
    setCats(data || [])
  }

  function tree() {
    const roots = (cats || []).filter(c => !c.parent_id)
    const childrenOf = id => cats.filter(c => c.parent_id === id)
    return roots.map(r => ({ ...r, children: childrenOf(r.id) }))
  }

  async function onCreate() {
    if (!name.trim()) return
    setBusy(true); setError('')
    try {
      let image_url = null
      if (image) {
        const ext = image.name.split('.').pop()
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('category-images').upload(path, image)
        if (upErr) throw upErr
        const { data: pub } = supabase.storage.from('category-images').getPublicUrl(path)
        image_url = pub?.publicUrl || null
      }

      const { error: insErr } = await supabase.from('categories').insert({
        name: name.trim(),
        slug: slugify(name),
        parent_id: parent || null,
        image_url,
        sort_order: 0
      })
      if (insErr) throw insErr

      setName(''); setParent(''); setImage(null)
      await load()
    } catch (e) {
      setError(e.message || 'Помилка')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id) {
    if (!confirm('Видалити категорію? Будуть видалені і підкатегорії.')) return
    await supabase.from('categories').delete().eq('id', id)
    await load()
  }

  return (
    <div className="max-w-6xl mx-auto px-3 py-6">
      <h1 className="text-xl font-semibold mb-4">Категорії (адмін)</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* форма */}
        <div className="card">
          <div className="card-body">
            <div className="h2 mb-3">Створити</div>

            <label className="label">Назва</label>
            <input className="input" value={name} onChange={e=>setName(e.target.value)} />

            <label className="label mt-3">Батьківська (для підкатегорії)</label>
            <select className="input" value={parent} onChange={e=>setParent(e.target.value)}>
              <option value="">— Без батьківської (коренева)</option>
              {cats.filter(c=>!c.parent_id).map(c=>(
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <label className="label mt-3">Зображення (опц.)</label>
            <input type="file" accept="image/*" onChange={e=>setImage(e.target.files?.[0]||null)} />

            <div className="mt-4">
              <button className="btn-primary" onClick={onCreate} disabled={busy}>
                {busy ? 'Зберігаю…' : 'Додати'}
              </button>
              {error && <div className="text-red-600 mt-2">{error}</div>}
            </div>
          </div>
        </div>

        {/* дерево */}
        <div className="card">
          <div className="card-body">
            <div className="h2 mb-3">Список</div>
            <div className="space-y-3">
              {tree().map(r => (
                <div key={r.id} className="border rounded-xl">
                  <div className="flex items-center justify-between p-3">
                    <div className="font-medium">{r.name}</div>
                    <button className="btn-ghost" onClick={()=>remove(r.id)}>Видалити</button>
                  </div>
                  {r.children?.length > 0 && (
                    <div className="px-3 pb-3">
                      {r.children.map(ch => (
                        <div key={ch.id} className="flex items-center justify-between p-2 pl-4 rounded-lg bg-slate-50">
                          <div>{ch.name}</div>
                          <button className="btn-ghost" onClick={()=>remove(ch.id)}>Видалити</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {tree().length === 0 && <div className="text-slate-500">Поки порожньо.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
