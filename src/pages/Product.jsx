import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import HtmlContent from '../components/HtmlContent'

export default function Product() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (!mounted) return
      if (!error) setProduct(data)
      setLoading(false)
    })()
    return () => { mounted = false }
  }, [id])

  if (loading) return <div className="container mx-auto p-4">Завантаження…</div>
  if (!product) return <div className="container mx-auto p-4">Товар не знайдено</div>

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-auto object-contain" />
          ) : (
            <div className="p-10 text-slate-400">Без фото</div>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <div className="text-lg mt-2">{(product.price_dropship ?? product.price ?? 0).toFixed(2)} ₴</div>
          <div className="mt-2 text-sm text-slate-500">{product.in_stock ? 'В наявності' : 'Немає'}</div>

          <div className="mt-8 card overflow-x-hidden">
            <div className="card-body overflow-x-hidden">
              <HtmlContent html={product.description || ''} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
