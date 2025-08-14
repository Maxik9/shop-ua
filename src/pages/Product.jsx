// src/pages/Product.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useCart } from '../context/CartContext'

/**
 * SAFE (без зуму/лайтбоксу) + мобільні фікси переповнення:
 * - Усі колонки мають min-w-0
 * - Зовнішні контейнери: overflow-x-hidden / max-w-full
 * - Мініатюри: власний горизонтальний скрол, flex-none елементи
 * - Назва/опис: break-words, ніколи не вилазять за екран
 */
export default function Product() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [imgIndex, setImgIndex] = useState(0)

  const touchStartX = useRef(null)

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true); setError(''); setProduct(null); setImgIndex(0)
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, sku, name, description, price_dropship, image_url, gallery_json, in_stock')
          .eq('id', id)
          .single()

        if (error) {
          setError(error.message || 'Помилка завантаження')
        } else if (data) {
          const g = Array.isArray(data.gallery_json) ? data.gallery_json : []
          const photos = Array.from(new Set([data.image_url, ...g].filter(Boolean)))
          if (alive) setProduct({ ...data, _photos: photos })
        } else {
          setError('Товар не знайдено')
        }
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

  // свайп для великого фото
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

  // рендер станів
  if (loading) return <div className="container-page py-6">Завантаження…</div>
  if (error) {
    return (
      <div className="container-page py-6">
        <div className="alert-error mb-4">{error}</div>
        <Link to="/" className="btn-outline">← До каталогу</Link>
      </div>
    )
  }
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

  return (
    <div className="container-page py-4 sm:py-6 overflow-x-hidden">
      {/* Назад */}
      <div className="mb-3 sm:mb-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm btn-outline">
          <span>←</span> До каталогу
        </Link>
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

            {/* Мініатюри — ТІЛЬКИ ВНУТРІШНІЙ СКРОЛ, не розтягуємо сторінку */}
            {photos.length > 1 && (
              <div className="mt-3 w-full max-w-full overflow-hidden">
                <div
                  className="flex gap-3 overflow-x-auto pb-1 max-w-full"
                  style={{ WebkitOverflowScrolling: 'touch', scrollbarGutter: 'stable both-edges' }}
                >
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

      {/* Опис — ніколи не виходить за межі */}
      <div className="mt-8 card overflow-x-hidden">
        <div className="card-body overflow-x-hidden">
          <div
            className="prose max-w-none break-words"
            // якщо в описі трапляються таблиці/код з великою шириною — вони теж обріжуться без горизонтального скролу
            style={{ overflowX: 'hidden', wordBreak: 'break-word' }}
            dangerouslySetInnerHTML={{ __html: product.description || '' }}
          />
        </div>
      </div>
    </div>
  )
}
