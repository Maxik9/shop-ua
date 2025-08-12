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
    const { data } = await supabase.from('categories').select('*').order('name', { ascending: true })
    setCategories(data || [])
  }

  async function loadProducts() {
    setLoading(true)
    let q = supabase.from('products').select('*').order('created_at', { ascending: false })
    if (selected !== 'all') q = q.eq('category_id', selected)
    const { data } = await q
    setProducts(data || [])
    setLoading(false)
  }

  return (
    <div className="container-page my-5">
      {/* Фільтри */}
      <div className="flex flex-wrap gap-2 mb-4">
        <FilterBtn active={selected==='all'} onClick={()=>setSelected('all')}>Усі</FilterBtn>
        {categories.map(c => (
          <FilterBtn key={c.id} active={selected===c.id} onClick={()=>setSelected(c.id)}>
            {c.name}
          </FilterBtn>
        ))}
      </div>

      {loading && <p className="text-muted">Завантаження…</p>}
      {!loading && products.length===0 && <p className="text-muted">Нічого не знайдено.</p>}

      {/* Сітка */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  )
}

function FilterBtn({active, children, ...props}) {
  const base = 'btn-ghost'
  const normal = 'btn-outline'
  return (
    <button className={active ? base : normal} {...props}>{children}</button>
  )
}
