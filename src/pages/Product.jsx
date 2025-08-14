// src/pages/Product.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useCart } from '../context/CartContext'

export default function Product() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [imgIndex, setImgIndex] = useState(0)

  const startXRef = useRef(null)
  const thumbsRef = useRef(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('id, sku, name, description, price_dropship, image_url, gallery_json, in_stock')
        .eq('id', id)
        .single()

      if (!mounted) return
      if (!error && data) {
        const gallery = Array.isArray(data.gallery_json) ? data.gallery_json : []
        const photos = [data.image_url, ...gallery].filter(Boolean)
        const uniq = Array.from(new Set(photos))
        setProduct({ ...data, _photos: uniq })
        setImgIndex(0)
      }
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [id])

  const photos = useMemo(() => product?._photos || [], [product])

  // keep active thumb in view (scroll only inside its own strip)
  useEffect(() => {
    if (!thumbsRef.current) return
    const c = thumbsRef.current
    const item = c.querySelector(`[data-idx="${imgIndex}"]`)
    if (!item) return
    const left = item.offsetLeft
    const right = left + item.offsetWidth
    const viewL = c.scrollLeft
    const viewR = viewL + c.clientWidth
    if (left < viewL) c.scrollTo({ left: left - 8, behavior: 'smooth' })
    else if (right > viewR) c.scrollTo({ left: right - c.clientWidth + 8, behavior: 'smooth' })
  }, [imgIndex])

  if (loading) return <div className="container-page py-6">Завантаження…</div>

  if (!product) {
    return (
      <div className="container-page py-6">
        <div className="mb-4">Товар не знайдено.</div>
        <Link to="/" className="btn-outline">← До каталогу</Link>
      </div>
    )
  }

  const canBuy = !!product.in_stock
  const addOne = () => addItem?.(product, 1, product.price_dropship)
  const buyNow = () => { addItem?.(product, 1, product.price_dropship); navigate('/cart') }

  function goTo(n){
    if (!photos.length) return
    const next = (n + photos.length) % photos.length
    setImgIndex(next)
  }
  const prevImg = () => goTo(imgIndex - 1)
  const nextImg = () => goTo(imgIndex + 1)

  function onTouchStart(e){ startXRef.current = e.touches?.[0]?.clientX ?? null }
  function onTouchEnd(e){
    const sx = startXRef.current
    if (sx == null) return
    const ex = e.changedTouches?.[0]?.clientX ?? sx
    const dx = ex - sx
    if (dx > 40) prevImg()
    else if (dx < -40) nextImg()
    startXRef.current = null
  }

  return (
    <div className="container-page py-4 sm:py-6 overflow-x-hidden">
      {/* Back */}
      <div className="mb-3 sm:mb-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm btn-outline">
          <span>←</span> До каталогу
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* PHOTO */}
        <div className="card w-full">
          <div className="card-body">
            <div
              className="relative w-full aspect-square bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center select-none"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {photos[imgIndex] ? (
                <img src={photos[imgIndex]} alt={product.name} className="w-full h-full object-contain" />
              ) : (
                <div className="text-muted">Немає фото</div>
              )}

              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Попереднє фото"
                    onClick={prevImg}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white border border-slate-300 shadow flex items-center justify-center"
                  >‹</button>
                  <button
                    type="button"
                    aria-label="Наступне фото"
                    onClick={nextImg}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white border border-slate-300 shadow flex items-center justify-center"
                  >›</button>
                </>
              )}
            </div>

            {/* THUMBS — внутрішній скрол, не впливає на ширину сторінки */}
            {photos.length > 1 && (
              <div className="mt-3 w-full max-w-full overflow-x-auto pb-1" ref={thumbsRef}>
                <div className="inline-flex gap-3">
                  {photos.map((src, i) => (
                    <button
                      key={i}
                      data-idx={i}
                      className={`flex-none w-20 h-20 sm:w-24 sm:h-24 bg-slate-100 rounded-lg overflow-hidden border ${i===imgIndex ? 'border-indigo-500 ring-2 ring-indigo-300' : 'border-slate-200'}`}
                      onClick={() => goTo(i)}
                      title={`Фото ${i+1}`}
                    >
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* INFO */}
        <div className="w-full min-w-0">
          <h1 className="text-[22px] sm:text-3xl font-bold leading-tight mb-2 break-words">
            {product.name}
          </h1>

          {product.sku && (
            <div className="text-sm text-muted mb-2">
              Артикул: <b>{product.sku}</b>
            </div>
          )}

          <div className="mb-3">
            {product.in_stock ? (
              <span className="inline-flex items-center px-2 py-[2px] rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                В наявності
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-[2px] rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                Немає в наявності
              </span>
            )}
          </div>

          {typeof product.price_dropship === 'number' && (
            <div className="text-2xl font-semibold mb-4">{Number(product.price_dropship).toFixed(2)} ₴</div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={addOne}
              className={`btn-outline w-full sm:w-auto ${canBuy ? '' : 'opacity-50 pointer-events-none'}`}
              disabled={!canBuy}
            >
              Додати в кошик
            </button>
            <button
              type="button"
              onClick={buyNow}
              className={`btn-primary w-full sm:w-auto ${canBuy ? '' : 'opacity-50 pointer-events-none'}`}
              disabled={!canBuy}
            >
              Замовити
            </button>
          </div>
        </div>
      </div>

      {/* DESCRIPTION */}
      <div className="mt-8 card">
        <div className="card-body">
          <div
            className="prose max-w-none break-words"
            dangerouslySetInnerHTML={{ __html: product.description || '' }}
          />
        </div>
      </div>
    </div>
  )
}
