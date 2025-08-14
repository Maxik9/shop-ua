// src/pages/CategoriesHome.jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function CategoriesHome() {
  const [cats, setCats] = useState([])

  useEffect(() => {
    supabase.from('categories')
      .select('*')
      .is('parent_id', null)             // тільки верхній рівень
      .order('name', { ascending: true })
      .then(({ data }) => setCats(data || []))
  }, [])

  return (
    <div className="container-page my-6">
      <h1 className="h1 mb-4">Категорії</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cats.map(c => (
          <Link key={c.id} to={`/category/${c.id}`} className="card hover:shadow-md transition">
            <div className="card-body">
              <div className="aspect-[16/10] bg-slate-100 rounded-xl overflow-hidden mb-3">
                {c.image_url && <img src={c.image_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="font-medium">{c.name}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
