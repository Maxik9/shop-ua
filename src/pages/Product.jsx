import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useCart } from '../context/CartContext'

export default function Product() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { add } = useCart()

  const [product, setProduct] = useState(null)
  const [gallery, setGallery] = useState([])
  const [i, setI] = useState(0)

  useEffect(() => {
    load()
    // eslint-disable-next-line
  }, [id])

  async function load() {
    const { data } = await supabase.from('products').select('*').eq('id', id).single()
    setProduct(data || null)
    const g = (data?.gallery_json && Array.isArray(data.gallery_json)) ? data.gallery_json : []
    const arr = (data?.image_url ? [data.image_url, ...g] : g).slice(0, 12)
    setGallery(arr)
    setI(0)
  }

  if (!product) return <div className="container-page my-6">Завантаження…</div>

  const cur = gallery[i] || product.image_url

  return (
    <div className="container-page my-6">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Галерея */}
        <div className="relative">
          <div className="card overflow-hidden">
            <div className="w-full aspect-[4/3] bg-slate-100">
              {cur && <img src={cur} alt={product.name} className="w-full h-full object-contain" />}
            </div>
          </div>

          {/* Стрелки */}
          {gallery.length > 1 && (
            <>
              <button
                className="btn-ghost absolute left-[-10px] top-1/2 -translate-y-1/2"
                onClick={() => setI((i - 1 + gallery.length) % gallery.length)}
              >‹</button>
              <button
                className="btn-ghost absolute right-[-10px] top-1/2 -translate-y-1/2"
                onClick={() => setI((i + 1) % gallery.length)}
              >›</button>
            </>
          )}

          {/* Превью */}
          {gallery.length > 1 && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {gallery.map((src, idx) => (
                <button
                  key={idx}
                  onClick={() => setI(idx)}
                  className={`overflow-hidden rounded-xl border ${i===idx ? 'border-indigo-500' : 'border-slate-200'}`}
                  style={{width:92, height:92, background:'#f1f5f9'}}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Инфо */}
        <div>
          <h1 className="h1 mb-2">{product.name}</h1>
          {product.description && (
            <p className="text-[16px] leading-7 text-slate-700 mb-4 whitespace-pre-wrap">{product.description}</p>
          )}

          <div className="text-[18px] mb-5">
            Дроп-ціна:&nbsp;
            <span className="price text-[22px]">{Number(product.price_dropship).toFixed(2)} ₴</span>
          </div>

          <div className="flex gap-3">
            <button className="btn-outline" onClick={() => add(product)}>Додати в кошик</button>
            <button
              className="btn-primary"
              onClick={() => { add(product); navigate('/cart') }}
            >Замовити</button>
          </div>
        </div>
      </div>
    </div>
  )
}
