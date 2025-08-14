import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import HtmlEditor from '../components/HtmlEditor'
import HtmlContent from '../components/HtmlContent'

export default function AdminHtmlEditor() {
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)

  const [current, setCurrent] = useState(null)
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('id, sku, name, description, image_url')
        .order('id', { ascending: false })
        .limit(500)
      if (!error) setItems(data || [])
      setLoading(false)
    })()
  }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return items
    return items.filter(p =>
      (p.name || '').toLowerCase().includes(s) ||
      (p.sku || '').toLowerCase().includes(s)
    )
  }, [q, items])

  const pick = (p) => {
    setCurrent(p)
    setDesc(p.description || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const save = async () => {
    if (!current) return
    try {
      setSaving(true); setMsg('')
      const { error } = await supabase.from('products').update({ description: desc }).eq('id', current.id)
      if (error) throw error
      setMsg('Опис збережено')
      // оновити локально
      setItems(prev => prev.map(it => it.id === current.id ? { ...it, description: desc } : it))
    } catch (e) {
      setMsg(e.message || 'Помилка збереження')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Редактор HTML опису</h1>
        <Link to="/admin" className="btn-outline">← Адмін</Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-body">
            <div className="grid sm:grid-cols-3 gap-4 items-center">
              <div className="sm:col-span-2">
                <input className="input" placeholder="Пошук по назві або SKU…"
                  value={q} onChange={e=>setQ(e.target.value)} />
              </div>
              <div className="text-sm text-muted text-right">{filtered.length} шт.</div>
            </div>

            <div className="mt-4 divide-y">
              {loading ? <div className="text-muted">Завантаження…</div> : filtered.map(p => (
                <div key={p.id} className="py-3 flex items-center gap-3">
                  <div className="w-14 h-14 bg-slate-100 rounded overflow-hidden flex items-center justify-center">
                    {p.image_url ? <img src={p.image_url} alt={p.name} className="object-cover w-full h-full" /> : <span className="text-xs text-slate-400">без фото</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-sm text-slate-500 truncate">{p.sku}</div>
                  </div>
                  <button className="btn-outline" onClick={() => pick(p)}>Редагувати опис</button>
                </div>
              ))}
              {!loading && filtered.length === 0 && <div className="text-muted">Нічого не знайдено.</div>}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            {!current ? (
              <div className="text-muted">Оберіть товар ліворуч для редагування опису.</div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 bg-slate-100 rounded overflow-hidden flex items-center justify-center">
                    {current.image_url ? <img src={current.image_url} alt={current.name} className="object-cover w-full h-full" /> : <span className="text-xs text-slate-400">без фото</span>}
                  </div>
                  <div className="font-medium">{current.name}</div>
                  <div className="text-sm text-slate-500">{current.sku}</div>
                </div>

                <HtmlEditor value={desc} onChange={setDesc} />

                <div className="flex gap-3 mt-4">
                  <button className="btn-primary" disabled={saving} onClick={save}>
                    {saving ? 'Збереження…' : 'Зберегти опис'}
                  </button>
                  {msg && <div className="self-center text-emerald-700">{msg}</div>}
                </div>

                <div className="mt-6">
                  <div className="text-sm text-slate-600 mb-2">Превʼю</div>
                  <div className="card">
                    <div className="card-body">
                      <HtmlContent html={desc} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
