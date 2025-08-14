import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function CategoriesHome() {
  const [cats, setCats] = useState([])

  useEffect(() => {
    supabase.from('categories')
      .select('*')
      .is('parent_id', null)
      .order('name')
      .then(({ data }) => setCats(data || []))
  }, [])

  return (
    <div className="max-w-6xl mx-auto p-3">
      <h1 className="text-2xl font-semibold mb-4">Категорії</h1>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {cats.map(c => (
          <Link key={c.id} to={`/category/${c.id}`} className="block bg-white rounded-xl border border-slate-200 hover:shadow-sm transition">
            <div className="w-full aspect-[4/3] rounded-t-xl overflow-hidden bg-slate-100">
              {c.image_url && <img src={c.image_url} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="p-3 font-medium">{c.name}</div>
          </Link>
        ))}
        {cats.length===0 && <div className="text-slate-500">Категорій поки немає.</div>}
      </div>
    </div>
  )
}
