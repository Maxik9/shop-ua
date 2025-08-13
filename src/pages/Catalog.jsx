// src/pages/Catalog.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import ProductCard from '../components/ProductCard'

export default function Catalog() {
  const [categories, setCategories] = useState([])
  const [selected, setSelected] = useState('all')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadCategories() }, [])
  useEffect(() => { loadProducts() }, [selected])

  async function loadCategories(){
    const { data } = await supabase.from('categories').select('*').order('name', { ascending: true })
    setCategories(data || [])
  }

  async function loadProducts(){
    setLoading(true)
    try {
      let query = supabase.from('products').select('*').order('created_at', { ascending: false })
      if (selected !== 'all') query = query.eq('category_id', selected)
      const { data, error } = await query
      if (error) throw error
      setProducts(data || [])
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-3 py-4 sm:py-6">
      {/* Фільтри */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={()=>setSelected('all')}
                className={chipCls(selected==='all')}>
          Усі
        </button>
        {categories.map(c => (
          <button key={c.id}
                  onClick={()=>setSelected(c.id)}
                  className={chipCls(selected===c.id)}>
            {c.name}
          </button>
        ))}
      </div>

      {loading && <p className="text-muted">Завантаження…</p>}
      {!loading && products.length===0 && <p className="text-muted">Нічого не знайдено.</p>}

      {/* Сітка карток (адаптив) */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mt-4">
        {products.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  )
}

function chipCls(active) {
  return `px-3 py-1.5 rounded-full border text-sm ${
    active ? 'border-indigo-600 text-indigo-700 bg-indigo-50'
           : 'border-slate-200 text-slate-700 hover:bg-slate-100'
  }`
}
