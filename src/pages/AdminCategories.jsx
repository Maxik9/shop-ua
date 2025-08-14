import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

/**
 * Адмінка категорій і підкатегорій:
 * - CRUD (назва, батько, обкладинка)
 * - дерево категорій з фільтром
 * - адаптивний інтерфейс
 * - збереження зображення в bucket "category-images"
 */

export default function AdminCategories() {
  const empty = { id: null, name: '', parent_id: null, image_url: '' }

  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(false)

  // Форма
  const [form, setForm] = useState(empty)
  const [file, setFile] = useState(null)

  // UI / пошук
  const [q, setQ] = useState('')
  const [expanded, setExpanded] = useState({}) // id -> bool для розгортання гілок

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })
    if (!error) setCats(data || [])
    setLoading(false)
  }

  function startCreate(parent_id = null) {
    setForm({ ...empty, parent_id })
    setFile(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function startEdit(c) {
    setForm({
      id: c.id,
      name: c.name || '',
      parent_id: c.parent_id || null,
      image_url: c.image_url || ''
    })
    setFile(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function uploadImageIfNeeded(f) {
    if (!f) return null
    const bucket = 'category-images'
    const ext = f.name.split('.').pop()
    const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from(bucket).upload(path, f, { upsert: false })
    if (error) throw error
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  async function save() {
    if (!form.name.trim()) { alert('Вкажіть назву категорії'); return }
    setLoading(true)
    try {
      let image_url = form.image_url
      if (file) {
        const url = await uploadImageIfNeeded(file)
        if (url) image_url = url
      }

      const payload = {
        name: form.name.trim(),
        parent_id: form.parent_id || null,
        image_url: image_url || null
      }

      if (form.id) {
        await supabase.from('categories').update(payload).eq('id', form.id)
      } else {
        await supabase.from('categories').insert(payload)
      }

      await loadAll()
      setForm(empty)
      setFile(null)
    } catch (e) {
      console.error(e)
      alert(e.message || 'Помилка збереження')
    } finally {
      setLoading(false)
    }
  }

  async function del(id) {
    if (!window.confirm('Видалити категорію? У підкатегорій ця категорія стане без батьківської.')) return
    setLoading(true)
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) alert(error.message)
    await loadAll()
    setLoading(false)
  }

  // ---- Побудова списків/дерева ----

  // Фільтр за рядком
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return cats
    return (cats || []).filter(
      c =>
        (c.name || '').toLowerCase().includes(t)
    )
  }, [q, cats])

  // Групування за parent_id для побудови дерева
  const byParent = useMemo(() => {
    /** @type {Record<string, any[]>} */
    const ids = {}
    ;(filtered || []).forEach(c => {
      const p = c.parent_id || '__root'
      if (!ids[p]) ids[p] = []
      ids[p].push(c)
    })
    // Впорядкуємо всередині кожної групи
    Object.keys(ids).forEach(k => ids[k].sort((a,b) => (a.name||'').localeCompare(b.name||'')))
    return ids
  }, [filtered])

  function toggle(id) {
    setExpanded(s => ({ ...s, [id]: !s[id] }))
  }

  // Рекурсивний рендер рядка категорії
  function CatRow({ node, level = 0 }) {
    const children = byParent[node.id] || []
    const hasKids = children.length > 0
    const open = expanded[node.id] ?? true

    return (
      <>
        <tr className="border-t border-slate-100">
          <td className="py-2 pr-3">
            <div className="flex items-center gap-2">
              <div style={{ width: level * 16 }} />
              {hasKids && (
                <button
                  className="text-slate-500 hover:text-slate-700"
                  title={open ? 'Згорнути' : 'Розгорнути'}
                  onClick={() => toggle(node.id)}
                >
                  {open ? '▾' : '▸'}
                </button>
              )}
              {!hasKids && <span className="text-slate-300">•</span>}
              <span className="font-medium">{node.name}</span>
            </div>
          </td>
          <td className="py-2 pr-3">
            {node.parent_id
              ? (cats.find(x => x.id === node.parent_id)?.name || '—')
              : <span className="text-slate-400">Корінь</span>}
          </td>
          <td className="py-2 pr-3">
            <div className="flex items-center gap-2">
              <button className="btn-outline input-xs" onClick={() => startEdit(node)}>Редагувати</button>
              <button className="btn-ghost input-xs" onClick={() => startCreate(node.id)}>+ Підкатегорія</button>
              <button className="btn-ghost input-xs" onClick={() => del(node.id)}>Видалити</button>
            </div>
          </td>
        </tr>

        {hasKids && open && children.map(child => (
          <CatRow key={child.id} node={child} level={level + 1} />
        ))}
      </>
    )
  }

  return (
    <div className="container-page my-6">
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h1 className="h1">Категорії та підкатегорії</h1>
            <div className="flex gap-2">
              <button className="btn-outline" onClick={() => startCreate(null)}>Нова коренева</button>
              <button className="btn-ghost" onClick={loadAll} disabled={loading}>Оновити</button>
            </div>
          </div>

          {/* Форма створення/редагування */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Field label="Назва категорії">
                <input
                  className="input"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Напр.: Автоклави"
                />
              </Field>

              <Field label="Батьківська категорія">
                <select
                  className="input"
                  value={form.parent_id || ''}
                  onChange={e => setForm({ ...form, parent_id: e.target.value || null })}
                >
                  <option value="">— без батьківської —</option>
                  {cats
                    .filter(c => c.id !== form.id) // не дозволяти ставити батьком саму себе
                    .sort((a,b)=>(a.name||'').localeCompare(b.name||''))
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
              </Field>

              <div className="flex gap-2">
                <button className="btn-primary" onClick={save} disabled={loading}>
                  {form.id ? 'Зберегти' : 'Створити'}
                </button>
                {form.id && (
                  <button className="btn-ghost" onClick={() => { setForm(empty); setFile(null) }}>
                    Скасувати
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Field label="Обкладинка (необов’язково)">
                {form.image_url && (
                  <div className="mb-2 w-full aspect-[4/3] bg-slate-100 rounded-xl overflow-hidden">
                    <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="input"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                />
              </Field>
            </div>
          </div>
        </div>
      </div>

      {/* Список/дерево */}
      <div className="card mt-6">
        <div className="card-body">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <input
              className="input input-xs w-[260px]"
              placeholder="Пошук по назві…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
            <div className="text-muted text-sm ml-auto">
              {filtered.length} запис(ів)
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-[14px]">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Категорія</th>
                  <th className="py-2 pr-3">Батько</th>
                  <th className="py-2 pr-3 w-[220px]">Дії</th>
                </tr>
              </thead>
              <tbody>
                {(byParent['__root'] || []).map(root => (
                  <CatRow key={root.id} node={root} />
                ))}
                {(byParent['__root'] || []).length === 0 && (
                  <tr><td className="py-6 text-center text-muted" colSpan={3}>Порожньо</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-sm text-muted mb-1">{label}</div>
      {children}
    </div>
  )
}
