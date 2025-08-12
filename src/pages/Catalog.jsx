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

  async function loadCategories() {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })
    setCategories(data || [])
  }

  async function loadProducts() {
    setLoading(true)
    let query = supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    if (selected !== 'all') query = query.eq('category_id', selected)
    const { data, error } = await query
    if (!error) setProducts(data || [])
    setLoading(false)
  }

  return (
    <div className="max-w-6xl mx-auto px-3 my-6">
      {/* Фільтри категорій */}
      <div className="flex flex-wrap gap-2 mb-4">
        <FilterBtn active={selected === 'all'} onClick={() => setSelected('all')}>
          Усі
        </FilterBtn>
        {categories.map(c => (
          <FilterBtn
            key={c.id}
            active={selected === c.id}
            onClick={() => setSelected(c.id)}
          >
            {c.name}
          </FilterBtn>
        ))}
      </div>

      {loading && <p className="text-slate-500">Завантаження…</p>}
      {!loading && products.length === 0 && <p className="text-slate-600">Нічого не знайдено.</p>}

      {/* Сітка товарів */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {products.map(p => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  )
}

/** Кнопка-фільтр з активним станом (Tailwind) */
function FilterBtn({ active, children, ...props }) {
  const base =
    'px-3 h-9 inline-flex items-center rounded-lg border text-sm transition'
  const normal = 'border-slate-300 bg-white hover:bg-slate-50'
  const activeCls = 'border-indigo-600 text-indigo-700 bg-indigo-50'
  return (
    <button
      className={`${base} ${active ? activeCls : normal}`}
      {...props}
    >
      {children}
    </button>
  )
}
