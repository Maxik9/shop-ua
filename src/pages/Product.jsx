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
        setLoading(true)
        setError('')

        const { data, error } = await supabase
          .from('products')
          .select('id,name,description,price_dropship,image_url,gallery_json')
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

        if (mounted) {
          setProduct(data)
          setGallery(uniq)
          setIdx(0)
        }
      } catch (e) {
        if (mounted) setError(e.message || 'Помилка завантаження товару')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [id])

  if (loading) {
    return <div className="container-page my-6">Завантаження…</div>
  }

  if (error) {
    return (
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
  }

  if (!product) {
    return (
      <div className="container-page my-6">
        <div className="text-muted">Товар не знайдено.</div>
      </div>
    )
  }

  const cur = gallery[idx] || product.image_url
  const addOne = () => addItem(product, 1, product.price_dropship)
  const buyNow = () => { addItem(product, 1, product.price_dropship); navigate('/cart') }

  function prev() { if (gallery.length) setIdx(v => (v - 1 + gallery.length) % gallery.length) }
  function next() { if (gallery.length) setIdx(v => (v + 1) % gallery.length) }

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

          {gallery.length > 1 && (
            <>
              <button className="btn-ghost absolute left-[-10px] top-1/2 -translate-y-1/2" onClick={prev}>‹</button>
              <button className="btn-ghost absolute right-[-10px] top-1/2 -translate-y-1/2" onClick={next}>›</button>
            </>
          )}

          {gallery.length > 1 && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {gallery.map((src, i) => (
                <button
                  key={src + i}
                  onClick={() => setIdx(i)}
                  className={`overflow-hidden rounded-xl border ${idx===i ? 'border-indigo-500' : 'border-slate-200'}`}
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
            <p className="text-[16px] leading-7 text-slate-700 mb-4 whitespace-pre-wrap">
              {product.description}
            </p>
          )}

          <div className="text-[18px] mb-5">
            Дроп-ціна:&nbsp;
            <span className="price text-[22px]">
              {Number(product.price_dropship).toFixed(2)} ₴
            </span>
          </div>

          <div className="flex gap-3">
            <button className="btn-outline" onClick={addOne}>Додати в кошик</button>
            <button className="btn-primary" onClick={buyNow}>Замовити</button>
          </div>
        </div>
      </div>
    </div>
  )
}
