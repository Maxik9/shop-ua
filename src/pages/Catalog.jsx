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

  const wrap = {maxWidth:1100, margin:'24px auto', padding:'0 12px'}

  return (
    <div style={wrap}>
      <div style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:16}}>
        <FilterBtn active={selected==='all'} onClick={()=>setSelected('all')}>Усі</FilterBtn>
        {categories.map(c => (
          <FilterBtn key={c.id} active={selected===c.id} onClick={()=>setSelected(c.id)}>{c.name}</FilterBtn>
        ))}
      </div>

      {loading && <p style={{color:'#64748b'}}>Завантаження…</p>}
      {!loading && products.length===0 && <p style={{color:'#64748b'}}>Нічого не знайдено.</p>}

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:16}}>
        {products.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  )
}

function FilterBtn({active, children, ...props}) {
  const base = {padding:'8px 12px', borderRadius:10, fontSize:14, border:'1px solid #d1d5db', background:'#fff', cursor:'pointer', transition:'all .15s'}
  const activeS = {border:'2px solid #4f46e5', background:'#eef2ff', color:'#3730a3'}
  return (
    <button {...props}
      style={{...base, ...(active?activeS:{})}}
      onMouseOver={e=>{ if(!active) e.currentTarget.style.background='#f8fafc' }}
      onMouseOut={e=>{ if(!active) e.currentTarget.style.background='#fff' }}>
      {children}
    </button>
  )
}
