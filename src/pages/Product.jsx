// src/pages/Product.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useCart } from '../context/CartContext'
import HtmlContent from '../components/HtmlContent'

export default function Product() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { addItem } = useCart()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [imgIndex, setImgIndex] = useState(0)

  // swipe для великого фото
  const touchStartX = useRef(null)

  // стилі смуги мініатюр — внутрішній скрол, не розтягує сторінку
  const thumbStripStyle = {
    display: 'grid',
    gridAutoFlow: 'column',
    gridAutoColumns: 'min-content',
    gap: '12px',
    overflowX: 'auto',
    overscrollBehaviorX: 'contain',
    WebkitOverflowScrolling: 'touch',
    padding: '0 8px 6px',
    maxWidth: '100%',
    contain: 'inline-size',
  }

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true); setError(''); setProduct(null); setImgIndex(0)
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, sku, name, description, price_dropship, image_url, gallery_json, in_stock, category_id')
          .eq('id', id)
          .single()

        if (error) setError(error.message || 'Помилка завантаження')
        else if (data) {
          const g = Array.isArray(data.gallery_json) ? data.gallery_json : []
          const photos = Array.from(new Set([data.image_url, ...g].filter(Boolean)))
          if (alive) setProduct({ ...data, _photos: photos })
        } else setError('Товар не знайдено')
      } catch (e) {
        setError(e.message || 'Непередбачена помилка')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [id])

  const photos = useMemo(() => product?._photos || [], [product])

  // керування фото
  const goTo = (n) => {
    if (!photos.length) return
    const next = (n + photos.length) % photos.length
    setImgIndex(next)
  }
  const prev = () => goTo(imgIndex - 1)
  const next = () => goTo(imgIndex + 1)

  // свайп великого фото
  const onTouchStart = (e) => { touchStartX.current = e.touches?.[0]?.clientX ?? null }
  const onTouchEnd = (e) => {
    const sx = touchStartX.current
    if (sx == null) return
    const ex = e.changedTouches?.[0]?.clientX ?? sx
    const dx = ex - sx
    if (dx > 40) prev()
    else if (dx < -40) next()
    touchStartX.current = null
  }

  // ――― NAVIGATION: back to category we came from ―――
  const backToCategory = () => {
    // 1) якщо ми прийшли з категорії — просто крок назад в історії
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    // 2) якщо передали явно шлях категорії через state
    const fromCatPath = location.state?.fromCategoryPath || location.state?.fromCategory
    if (fromCatPath) {
      navigate(fromCatPath, { replace: true })
      return
    }
    // 3) fallback: якщо у товару є category_id — спробуємо /category/:id
    if (product?.category_id) {
      navigate(`/category/${product.category_id}`, { replace: true })
      return
    }
    // 4) запасний план — каталог
    navigate('/')
  }

  // стани
  if (loading) return <div className="container-page mt-header">Завантаження…</div>
  if (error) {
    return (
      <div className="container-page mt-header">
        <div className="alert-error mb-4">{error}</div>
        <button type="button" onClick={backToCategory} className="btn-outline">← Назад</button>
      </div>
    )
  }
  if (!product) {
    return (
      <div className="container-page mt-header">
        <div className="mb-4">Товар не знайдено.</div>
        <button type="button" onClick={backToCategory} className="btn-outline">← Назад</button>
      </div>
    )
  }

  const canBuy = !!product.in_stock
  const addOne = () => addItem?.(product, 1, product.price_dropship)
  const buyNow = () => { addItem?.(product, 1, product.price_dropship); navigate('/cart') }

  return (
    <div className="container-page mt-header py-4 sm:py-6 overflow-x-hidden">
      {/* Назад */}
      <div className="mb-3 sm:mb-4">
        <button
          type="button"
          onClick={backToCategory}
          className="inline-flex items-center gap-2 text-sm btn-outline"
        >
          <span>←</span> Назад
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 items-start">
        {/* Фото */}
        <div className="card w-full min-w-0">
          <div className="card-body overflow-x-hidden">
            <div
              className="relative w-full max-w-full aspect-square bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center select-none"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {photos[imgIndex] ? (
                <img
                  src={photos[imgIndex]}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-muted">Немає фото</div>
              )}

              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Попереднє фото"
                    onClick={prev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 hover:bg-white border border-slate-300 shadow flex items-center justify-center z-20"
                  >‹</button>
                  <button
                    type="button"
                    aria-label="Наступне фото"
                    onClick={next}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 hover:bg-white border border-slate-300 shadow flex items-center justify-center z-20"
                  >›</button>
                </>
              )}
            </div>

            {/* Мініатюри — внутрішній скрол, не розтягують сторінку */}
            {photos.length > 1 && (
              <div className="mt-3 w-full max-w-full overflow-hidden">
                <div style={thumbStripStyle}>
                  {photos.map((src, i) => (
                    <button
                      key={i}
                      className={`flex-none w-20 h-20 sm:w-24 sm:h-24 bg-slate-100 rounded-lg overflow-hidden border ${i===imgIndex ? 'border-indigo-600 outline outline-2 outline-indigo-500' : 'border-slate-200'}`}
                      onClick={() => setImgIndex(i)}
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

        {/* Інформація */}
        <div className="w-full min-w-0">
          <h1 className="text-[22px] sm:text-3xl font-bold leading-tight mb-2 break-words">
            {product.name}
          </h1>

          {product.sku && (
            <div className="text-sm text-muted mb-2 break-words">
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
              className={`btn-outline w-full sm:w-auto ${product.in_stock ? '' : 'opacity-50 pointer-events-none'}`}
              disabled={!product.in_stock}
            >
              Додати в кошик
            </button>
            <button
              type="button"
              onClick={buyNow}
              className={`btn-primary w-full sm:w-auto ${product.in_stock ? '' : 'opacity-50 pointer-events-none'}`}
              disabled={!product.in_stock}
            >
              Замовити
            </button>
          </div>
        </div>
      </div>

      {/* Опис */}
      <div className="mt-8 card overflow-x-hidden">
        <div className="card-body overflow-x-hidden">
          <HtmlContent html={product.description || ''} />
        </div>
      </div>
    </div>
  )
}
