// src/pages/Product.jsx — renders HTML description
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Product() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)

  useEffect(()=>{
    let mounted = true
    supabase.from('products').select('*').eq('id', id).single().then(({ data })=>{
      if (mounted) setProduct(data)
    })
    return ()=>{mounted=false}
  }, [id])

  if (!product) return <div className="container-page py-6">Завантаження…</div>

  return (
    <div className="container-page py-6">
      <h1 className="h1 mb-1">{product.name}</h1>
      <div className="mb-3">{product.in_stock ? (
        <span className="inline-flex items-center px-2 py-[2px] rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">В наявності</span>
      ) : (
        <span className="inline-flex items-center px-2 py-[2px] rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">Немає в наявності</span>
      )}</div>
      {product.sku && <div className="text-sm text-muted mb-4">Артикул: <b>{product.sku}</b></div>}

      {product.image_url && (
        <div className="mb-4 w-full max-w-xl aspect-[4/3] bg-slate-100 rounded-xl overflow-hidden">
          <img src={product.image_url} alt="" className="w-full h-full object-contain" />
        </div>
      )}

      <div className="prose max-w-none" dangerouslySetInnerHTML={{__html: product.description || ''}} />

      <div className="mt-6">
        <Link to="/" className="btn-outline">← До каталогу</Link>
      </div>
    </div>
  )
}
