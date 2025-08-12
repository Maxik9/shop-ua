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
    let query = supabase.from('products').select('*').order('created_at', { ascending: false })
    if (selected !== 'all') query = query.eq('category_id', selected)
    const { data, error } = await query
    if (!error) setProducts(data || [])
    setLoading(false)
  }

  return (
    <div style={{maxWidth:1100, margin:'24px auto', padding:'0 12px'}}>
      <div style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:16}}>
        <button onClick={()=>setSelected('all')} style={btn(selected==='all')}>Усі</button>
        {categories.map(c => (
          <button key={c.id} onClick={()=>setSelected(c.id)} style={btn(selected===c.id)}>{c.name}</button>
        ))}
      </div>

      {loading && <p>Завантаження…</p>}
      {!loading && products.length===0 && <p>Нічого не знайдено.</p>}

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:12}}>
        {products.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  )
}

function btn(active){
  return {
    padding:'6px 10px',
    borderRadius:8,
    border: active ? '2px solid #333' : '1px solid #ddd',
    background:'#fff',
    cursor:'pointer'
  }
}
