import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function AdminCategories() {
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')

  // форма
  const empty = { id:null, name:'', parent_id:'', image_url:'' }
  const [form, setForm] = useState(empty)
  const [file, setFile] = useState(null)

  useEffect(() => { load() }, [])
  async function load() {
    const { data } = await supabase.from('categories').select('*').order('name')
    setCats(data || [])
  }

  const options = useMemo(() => {
    return [{ id:'', name:'— без батьківської —' }, ...(cats || [])]
  }, [cats])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return cats
    return (cats || []).filter(c => (c.name || '').toLowerCase().includes(t))
  }, [cats, q])

  function startCreate() { setForm(empty); setFile(null) }
  function startEdit(c)  { setForm({ id:c.id, name:c.name||'', parent_id:c.parent_id||'', image_url:c.image_url||'' }); setFile(null) }

  async function uploadToStorage(f) {
    if (!f) return null
    const ext = f.name.split('.').pop()
    const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('category-images').upload(path, f)
    if (error) throw error
    const { data } = supabase.storage.from('category-images').getPublicUrl(path)
    return data.publicUrl
  }

  async function save() {
    if (!form.name.trim()) return alert('Вкажіть назву категорії')
    setLoading(true)
    try {
      let image_url = form.image_url
      if (file) image_url = await uploadToStorage(file)

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

      await load()
      setForm(empty); setFile(null)
    } catch(e) { alert(e.message || 'Помилка') }
    finally { setLoading(false) }
  }

  async function del(id) {
    if (!window.confirm('Видалити категорію? Її підкатегорії стануть верхнього рівня.')) return
    // відчепити дітей
    await supabase.from('categories').update({ parent_id: null }).eq('parent_id', id)
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) return alert(error.message)
    await load()
    if (form.id === id) setForm(empty)
  }

  return (
    <div className="max-w-6xl mx-auto p-3">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Категорії</h1>
        <button className="btn-outline" onClick={startCreate}>Нова категорія</button>
      </div>

      {/* Форма */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm text-slate-500 mb-1">Назва</div>
          <input className="input mb-3" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />

          <div className="text-sm text-slate-500 mb-1">Батьківська категорія</div>
          <select className="input mb-3" value={form.parent_id ?? ''} onChange={e=>setForm({...form, parent_id:e.target.value})}>
            {options.map(o => <option key={o.id || '__root'} value={o.id}>{o.name}</option>)}
          </select>

          <div className="text-sm text-slate-500 mb-1">Зображення</div>
          {form.image_url && (
            <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 mb-2">
              <img src={form.image_url} alt="" className="w-full h-full object-cover"/>
            </div>
          )}
          <input type="file" className="input mb-3" accept="image/*" onChange={e=>setFile(e.target.files?.[0] || null)} />

          <div className="flex gap-2">
            <button className="btn-primary" onClick={save} disabled={loading}>{form.id ? 'Зберегти' : 'Створити'}</button>
            {form.id && <button className="btn-ghost" onClick={()=>setForm(empty)}>Скасувати</button>}
          </div>
        </div>

        {/* Список / дерево */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <input className="input input-xs w-[260px]" placeholder="Пошук категорій…" value={q} onChange={e=>setQ(e.target.value)} />
            <div className="ml-auto text-slate-500 text-sm">{filtered.length} шт.</div>
          </div>

          <Tree cats={cats} filtered={filtered} onEdit={startEdit} onDel={del} />
        </div>
      </div>
    </div>
  )
}

function Tree({ cats, filtered, onEdit, onDel }) {
  // збудуємо дерево з урахуванням фільтру
  const byParent = useMemo(() => {
    constids: Record<string, any[]> = {}
    ;(filtered || []).forEach(c => {
      const p = c.parent_id || '__root'
      ;(ids[p] ||= []).push(c)
    })
    Object.values(ids).forEach(arr => arr.sort((a,b)=>a.name.localeCompare(b.name)))
    return ids
  }, [filtered])

  return (
    <div className="space-y-2">
      {(byParent['__root'] || []).map(c => (
        <Node key={c.id} node={c} byParent={byParent} depth={0} onEdit={onEdit} onDel={onDel}/>
      ))}
      {(!byParent['__root'] || byParent['__root'].length===0) && (
        <div className="text-slate-500 text-sm">Немає категорій</div>
      )}
    </div>
  )
}

function Node({ node, byParent, depth, onEdit, onDel }) {
  const children = byParent[node.id] || []
  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="text-slate-500 select-none" style={{ width: depth*14 }} />
        <div className="flex-1">
          <div className="font-medium">{node.name}</div>
          {node.parent_id && <div className="text-xs text-slate-500">Підкатегорія</div>}
        </div>
        <div className="flex gap-1">
          <button className="btn-outline input-xs" onClick={()=>onEdit(node)}>Редагувати</button>
          <button className="btn-ghost input-xs" onClick={()=>onDel(node.id)}>Видалити</button>
        </div>
      </div>
      {children.length>0 && (
        <div className="mt-1 space-y-1">
          {children.map(c => (
            <Node key={c.id} node={c} byParent={byParent} depth={depth+1} onEdit={onEdit} onDel={onDel}/>
          ))}
        </div>
      )}
    </div>
  )
}
