// src/pages/CategoriesHome.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Link, useNavigate } from 'react-router-dom'

export default function CategoriesHome() {
  const [cats, setCats] = useState([])
  const [q, setQ] = useState('')
  const nav = useNavigate()

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .is('parent_id', null)
      .order('sort_order', { ascending: true })
    if (!error) setCats(data || [])
  }

  function doSearch(e) {
    e.preventDefault()
    nav(`/search?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <div className="max-w-6xl mx-auto px-3 py-6">
      <form onSubmit={doSearch} className="relative mb-6">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input
          value={q}
          onChange={(e)=>setQ(e.target.value)}
          placeholder="Пошук товарів…"
          className="w-full h-12 rounded-2xl border border-slate-200 pl-11 pr-4 outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </form>

      <h1 className="text-xl font-semibold mb-4">Категорії</h1>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
        {cats.map(c => (
          <Link to={`/c/${c.slug}`} key={c.id}
            className="group rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-md transition">
            <div className="aspect-[4/3] bg-slate-100">
              {c.image_url && <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />}
            </div>
            <div className="p-3">
              <div className="font-medium group-hover:text-indigo-600">{c.name}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
