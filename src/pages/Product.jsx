// src/pages/Product.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useCart } from '../context/CartContext'

/**
 * Картка товару з перегортанням фото, стрічкою мініатюр та ЛАЙТБОКСОМ (збільшенням)
 * - Клік по головному фото відкриває повноекранний переглядач
 * - У переглядачі: зум +/- , перетягування, стрілки вліво/вправо, Esc — закрити
 */
export default function Product() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [imgIndex, setImgIndex] = useState(0)

  // swipe/scroll refs
  const startXRef = useRef(null)
  const thumbsRef = useRef(null)

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef({ dragging: false, sx: 0, sy: 0, px: 0, py: 0 })

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
        const g = Array.isArray(data.gallery_json) ? data.gallery_json : []
        const photos = [data.image_url, ...g].filter(Boolean)
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

  // Тримати активну мініатюру у видимості
  useEffect(() => {
    const c = thumbsRef.current
    if (!c) return
    const item = c.querySelector(`[data-idx="${imgIndex}"]`)
    if (!item) return
    const left = item.offsetLeft
    const right = left + item.offsetWidth
    const viewL = c.scrollLeft
    const viewR = viewL + c.clientWidth
    if (left < viewL) c.scrollTo({ left: left - 8, behavior: 'smooth' })
    else if (right > viewR) c.scrollTo({ left: right - c.clientWidth + 8, behavior: 'smooth' })
  }, [imgIndex])

  // Закриття lightbox по Esc
  useEffect(() => {
    function onKey(e){
      if (!lightboxOpen) return
      if (e.key === 'Escape') setLightboxOpen(false)
      else if (e.key === 'ArrowLeft') goTo(imgIndex - 1)
      else if (e.key === 'ArrowRight') goTo(imgIndex + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxOpen, imgIndex, photos.length])

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

  const goTo = (n) => {
    if (!photos.length) return
    const next = (n + photos.length) % photos.length
    setImgIndex(next)
  }
  const prevImg = () => goTo(imgIndex - 1)
  const nextImg = () => goTo(imgIndex + 1)

  const onTouchStart = (e) => { startXRef.current = e.touches?.[0]?.clientX ?? null }
  const onTouchEnd = (e) => {
    const sx = startXRef.current
    if (sx == null) return
    const ex = e.changedTouches?.[0]?.clientX ?? sx
    const dx = ex - sx
    if (dx > 40) prevImg()
    else if (dx < -40) nextImg()
    startXRef.current = null
  }

  function openLightbox(){
    setLightboxOpen(true)
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }
  function zoomIn(){ setZoom(z => Math.min(4, +(z + 0.25).toFixed(2))) }
  function zoomOut(){ setZoom(z => Math.max(1, +(z - 0.25).toFixed(2))) }
  function resetZoom(){ setZoom(1); setPan({ x: 0, y: 0 }) }

  function onWheel(e){
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.25 : -0.25
    setZoom(z => {
      const nz = Math.min(4, Math.max(1, +(z + delta).toFixed(2)))
      return nz
    })
  }

  function onDragStart(e){
    e.preventDefault()
    dragRef.current = { dragging: true, sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y }
  }
  function onDragMove(e){
    if (!dragRef.current.dragging) return
    const dx = e.clientX - dragRef.current.sx
    const dy = e.clientY - dragRef.current.sy
    setPan({ x: dragRef.current.px + dx, y: dragRef.current.py + dy })
  }
  function onDragEnd(){ dragRef.current.dragging = false }

  // Touch drag in lightbox
  function onTouchDragStart(e){
    if (e.touches.length !== 1) return
    dragRef.current = { dragging: true, sx: e.touches[0].clientX, sy: e.touches[0].clientY, px: pan.x, py: pan.y }
  }
  function onTouchDragMove(e){
    if (!dragRef.current.dragging || e.touches.length !== 1) return
    const dx = e.touches[0].clientX - dragRef.current.sx
    const dy = e.touches[0].clientY - dragRef.current.sy
    setPan({ x: dragRef.current.px + dx, y: dragRef.current.py + dy })
  }
  function onTouchDragEnd(){ dragRef.current.dragging = false }

  return (
    <div className="container-page py-4 sm:py-6 overflow-x-hidden">
      {/* Кнопка назад у верхній частині */}
      <div className="mb-3 sm:mb-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm btn-outline">
          <span>←</span> До каталогу
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 items-start">
        {/* Фото */}
        <div className="card w-full min-w-0">
          <div className="card-body">
            <div
              className="relative w-full aspect-square bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center select-none"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              onDoubleClick={openLightbox}
            >
              {photos[imgIndex] ? (
                <img
                  src={photos[imgIndex]}
                  alt={product.name}
                  className="w-full h-full object-contain cursor-zoom-in"
                  onClick={openLightbox}
                />
              ) : (
                <div className="text-muted">Немає фото</div>
              )}

              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Попереднє фото"
                    onClick={prevImg}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 hover:bg-white border border-slate-300 shadow flex items-center justify-center"
                  >‹</button>
                  <button
                    type="button"
                    aria-label="Наступне фото"
                    onClick={nextImg}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 hover:bg-white border border-slate-300 shadow flex items-center justify-center"
                  >›</button>
                </>
              )}
            </div>

            {/* Мініатюри — внутрішній скрол, не впливають на ширину сторінки */}
            {photos.length > 1 && (
              <div className="mt-3 w-full max-w-full">
                <div
                  ref={thumbsRef}
                  className="block w-full max-w-full overflow-x-auto overscroll-contain pb-1"
                  style={{ scrollbarGutter: 'stable both-edges' }}
                >
                  <div className="inline-flex gap-3">
                    {photos.map((src, i) => (
                      <button
                        key={i}
                        data-idx={i}
                        className={`flex-none w-20 h-20 sm:w-24 sm:h-24 bg-slate-100 rounded-lg overflow-hidden border ${i===imgIndex ? 'border-indigo-600 outline outline-2 outline-indigo-500' : 'border-slate-200'}`}
                        onClick={() => setImgIndex(i)}
                        title={`Фото ${i+1}`}
                      >
                        <img src={src} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Інформація */}
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

          {/* Кнопки */}
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

      {/* Опис */}
      <div className="mt-8 card">
        <div className="card-body">
          <div
            className="prose max-w-none break-words"
            dangerouslySetInnerHTML={{ __html: product.description || '' }}
          />
        </div>
      </div>

      {/* LIGHTBOX */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
          onWheel={onWheel}
          onMouseMove={onDragMove}
          onMouseUp={onDragEnd}
          onMouseLeave={onDragEnd}
          onTouchMove={onTouchDragMove}
          onTouchEnd={onTouchDragEnd}
        >
          <button
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-800 text-xl leading-none flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
            aria-label="Закрити"
          >
            ×
          </button>

          {/* Prev / Next */}
          {photos.length > 1 && (
            <>
              <button
                onClick={prevImg}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-slate-800 text-2xl"
                aria-label="Попереднє фото"
              >‹</button>
              <button
                onClick={nextImg}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-slate-800 text-2xl"
                aria-label="Наступне фото"
              >›</button>
            </>
          )}

          {/* Toolbar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            <button className="btn-outline !bg-white/90 !text-slate-900" onClick={zoomOut} disabled={zoom<=1}>−</button>
            <button className="btn-outline !bg-white/90 !text-slate-900" onClick={resetZoom}>100%</button>
            <button className="btn-outline !bg-white/90 !text-slate-900" onClick={zoomIn}>+</button>
          </div>

          {/* Image area */}
          <div
            className="relative max-w-[95vw] max-h-[85vh] overflow-hidden cursor-grab active:cursor-grabbing"
            onMouseDown={onDragStart}
            onTouchStart={onTouchDragStart}
          >
            <img
              src={photos[imgIndex]}
              alt=""
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
              className="select-none pointer-events-none object-contain max-h-[85vh] max-w-[95vw]"
              draggable={false}
            />
          </div>
        </div>
      )}
    </div>
  )
}
