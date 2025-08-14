// src/pages/Product.jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useCart } from '../context/CartContext'

export default function Product() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [product, setProduct] = useState(null)
  const [gallery, setGallery] = useState([])
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true); setError('')
        const { data, error } = await supabase
          .from('products')
          .select('id,name,description,price_dropship,image_url,gallery_json,in_stock')
          .eq('id', id)
          .maybeSingle()
        if (error) throw error
        if (!data) throw new Error('Товар не знайдено')

        let g = []
        const raw = data.gallery_json
        if (Array.isArray(raw)) g = raw
        else if (typeof raw === 'string' && raw.trim()) {
          try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) g = parsed } catch {}
        }
        const full = [data.image_url, ...g].filter(Boolean)
        const uniq = Array.from(new Set(full))
        if (mounted) { setProduct(data); setGallery(uniq); setIdx(0) }
      } catch (e) {
        if (mounted) setError(e.message || 'Помилка завантаження')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [id])

  if (loading) return <div className="container-page my-6">Завантаження…</div>
  if (error) return (
    <div className="container-page my-6">
      <div className="card">
        <div className="card-body">
          <div className="h2 mb-2">Помилка</div>
          <p className="text-muted mb-4">{error}</p>
          <Link to="/" className="btn-outline">Повернутися до каталогу</Link>
        </div>
      </div>
    </div>
  )
  if (!product) return <div className="container-page my-6 text-muted">Товар не знайдено.</div>

  const cur = gallery[idx] || product.image_url
  const addOne = () => addItem(product, 1, product.price_dropship)
  const buyNow = () => { addItem(product, 1, product.price_dropship); navigate('/cart') }

  function prev() { if (gallery.length) setIdx(v => (v - 1 + gallery.length) % gallery.length) }
  function next() { if (gallery.length) setIdx(v => (v + 1) % gallery.length) }

  return (
    <div className="max-w-6xl mx-auto px-3 py-4 sm:py-6">
      <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Галерея (на мобільному — 4:3, object-contain) */}
        <div className="relative">
          <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
            <div className="w-full aspect-[4/3]">
              {cur && <img src={cur} alt={product.name} className="w-full h-full object-contain" />}
            </div>
          </div>

          {gallery.length > 1 && (
            <>
              <button className="btn-ghost absolute left-[-10px] top-1/2 -translate-y-1/2" onClick={prev}>‹</button>
              <button className="btn-ghost absolute right-[-10px] top-1/2 -translate-y-1/2" onClick={next}>›</button>
            </>
          )}

          {gallery.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {gallery.map((src, i) => (
                <button
                  key={src + i}
                  onClick={() => setIdx(i)}
                  className={`shrink-0 overflow-hidden rounded-xl border ${idx===i ? 'border-indigo-500' : 'border-slate-200'}`}
                  style={{ width: 92, height: 92, background:'#f1f5f9' }}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Інфо */}
        <div>
          <h1 className="h1 mb-2">{product.name}</h1>
          {product.description && (
            <p className="text-[15px] sm:text-[16px] leading-7 text-slate-700 mb-4 whitespace-pre-wrap">
              {product.description}
            </p>
          )}

          <div className="mb-3">{product.in_stock ? (
            <span className="inline-flex items-center px-2 py-[2px] rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">В наявності</span>
          ) : (
            <span className="inline-flex items-center px-2 py-[2px] rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">Немає в наявності</span>
          )}</div>

          <div className="text-[17px] sm:text-[18px] mb-5">
            Дроп-ціна:&nbsp;
            <span className="price text-[20px] sm:text-[22px]">
              {Number(product.price_dropship).toFixed(2)} ₴
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button className="btn-outline w-full sm:w-auto" onClick={addOne} disabled={!product.in_stock} className={`btn-outline w-full sm:w-auto ${product.in_stock ? "" : "opacity-50 pointer-events-none"}`}>Додати в кошик</button>
            <button className={`btn-primary w-full sm:w-auto ${product.in_stock ? "" : "opacity-50 pointer-events-none"}`} disabled={!product.in_stock} onClick={buyNow}>Замовити</button>
          </div>
        </div>
      </div>
    </div>
  )
}
