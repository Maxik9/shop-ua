// src/pages/Product.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useCart } from '../context/CartContext'
import HtmlContent from '../components/HtmlContent'

// [SIZE] parse helper
function parseSizes(str){
  return (str||'').split(/[|,;]+/g).map(s=>s.trim()).filter(Boolean);
}

export default function Product() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { addItem } = useCart()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [imgIndex, setImgIndex] = useState(0)
  // [SIZE]
  const [sizes, setSizes] = useState([])
  const [size, setSize] = useState('')

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
    scrollbarWidth: 'thin',
  }

  const backToCategory = () => {
    const from = location.state?.from
    if (from) navigate(from)
    else history.back()
  }

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true); setError(''); setProduct(null); setImgIndex(0)
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, gallery_json')
          .eq('id', id)
          .single()
        if (error) throw error
        else if (data) {
          const g = Array.isArray(data.gallery_json) ? data.gallery_json : []
          const photos = Array.from(new Set([data.image_url, ...g].filter(Boolean)))
          if (alive){ setProduct({ ...data, _photos: photos }); const opts=parseSizes(data?.sizes); setSizes(opts); setSize(opts[0]||''); }
        } else setError('Товар не знайдено')
      } catch (e) {
        setError(e.message || 'Помилка завантаження')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [id])

  function onTouchStart(e){
    touchStartX.current = e.touches?.[0]?.clientX ?? null
  }
  function onTouchEnd(e){
    const x2 = e.changedTouches?.[0]?.clientX ?? null
    const x1 = touchStartX.current
    touchStartX.current = null
    if (x1==null || x2==null) return
    const dx = x2 - x1
    if (Math.abs(dx) < 30) return
    setImgIndex(prev => {
      const total = product?._photos?.length || 1
      if (dx < 0) return Math.min(total - 1, prev + 1)
      return Math.max(0, prev - 1)
    })
  }

  const addOne = () => addItem?.({ ...product, selected_size: (sizes.length? size : null) }, 1, product.price_dropship)
  const buyNow = () => { addItem?.({ ...product, selected_size: (sizes.length? size : null) }, 1, product.price_dropship); navigate('/cart') }

  if (loading) return <div className="container-page mt-header py-6">Завантаження…</div>
  if (error) return <div className="container-page mt-header py-6 text-red-600">{error}</div>
  if (!product) return null

  const photos = product._photos || []
  const mainImg = photos[imgIndex] || product.image_url

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
        <div>
          <div className="rounded-xl overflow-hidden bg-slate-100">
            {mainImg && (
              <img
                src={mainImg}
                alt={product.name}
                className="w-full h-full object-cover select-none"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
              />
            )}
          </div>

          {/* Смуга мініатюр */}
          {photos.length > 1 && (
            <div className="mt-3" style={thumbStripStyle}>
              {photos.map((u, i) => (
                <button
                  key={u}
                  className={`w-20 h-20 rounded-lg overflow-hidden bg-slate-100 border ${i===imgIndex ? 'border-indigo-500' : 'border-transparent'}`}
                  onClick={() => setImgIndex(i)}
                >
                  <img src={u} className="w-full h-full object-cover" alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Правий блок: назва, ціна, вибір, кнопки */}
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold mb-2">{product.name}</h1>

          {product.in_stock ? (
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-100 text-green-700 text-xs mb-3">
              В наявності
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs mb-3">
              Немає
            </span>
          )}

          {typeof product.price_dropship === 'number' && (
            <div className="text-2xl font-semibold mb-4">{Number(product.price_dropship).toFixed(2)} ₴</div>
          )}

          {/* [SIZE] селектор розміру */}
          {sizes.length > 0 && (
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Розмір</label>
              <select className="input w-[200px]" value={size} onChange={e=>setSize(e.target.value)}>
                {sizes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {/* Кнопки */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={addOne}
              className={`btn-outline w-full sm:w-auto ${product.in_stock ? '' : 'opacity-50 pointer-events-none'}`}
              disabled={!product.in_stock}
            >
              До кошика
            </button>

            <button
              type="button"
              onClick={buyNow}
              className={`btn-primary w-full sm:w-auto ${product.in_stock ? '' : 'opacity-50 pointer-events-none'}`}
              disabled={!product.in_stock}
            >
              Купити зараз
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
