import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import ProductCard from '../components/ProductCard'
import { useNavigate } from 'react-router-dom'

export default function Catalog(){
  const [products, setProducts] = useState([])
  const nav = useNavigate()

  useEffect(() => {
    supabase.from('products').select('*').order('created_at', { ascending:false })
      .then(({ data, error }) => { if(!error) setProducts(data || []) })
  }, [])

  function onSelect(p){
    nav('/new-order', { state: { product: p } })
  }

  return (
    <div style={{maxWidth:960, margin:'24px auto', display:'grid', gap:12, gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))'}}>
      {products.map(p => <ProductCard key={p.id} product={p} onSelect={onSelect} />)}
      {products.length===0 && <p>Товари незабаром з'являться…</p>}
    </div>
  )
}