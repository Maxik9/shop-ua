// src/pages/Product.jsx
import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Product() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [imgIndex, setImgIndex] = useState(0)

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
      if (!error) {
        // формуємо масив фото: спочатку головне, потім з галереї (без дублів)
        const gallery = Array.isArray(data?.gallery_json) ? data.gallery_json : []
        const photos = [data?.image_url, ...gallery].filter(Boolean)
        const uniq = Array.from(new Set(photos))
        setProduct({ ...data, _photos: uniq })
      }
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [id])

  const photos = useMemo(() => product?._photos || [], [product])

  if (loading) {
    return <div className="container-page py-6">Завантаження…</div>
  }
  if (!product) {
    return (
      <div className="container-page py-6">
        <div className="mb-4">Товар не знайдено.</div>
        <Link to="/" className="btn-outline">← До каталогу</Link>
      </div>
    )
  }

  return (
    <div className="container-page py-6">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Фото + галерея */}
        <div className="card">
          <div className="card-body">
            <div className="w-full aspect-square bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
              {photos[imgIndex] ? (
                <img src={photos[imgIndex]} alt="" className="w-full h-full object-contain" />
              ) : (
                <div className="text-muted">Немає фото</div>
              )}
            </div>

            {photos.length > 1 && (
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                {photos.map((src, i) => (
                  <button
                    key={i}
                    className={`w-24 h-24 bg-slate-100 rounded-lg overflow-hidden border ${i===imgIndex ? 'border-indigo-500 ring-2 ring-indigo-300' : 'border-slate-200'}`}
                    onClick={() => setImgIndex(i)}
                    title={`Фото ${i+1}`}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Інфо */}
        <div>
          <h1 className="h1 mb-2">{product.name}</h1>
          {product.sku && <div className="text-sm text-muted mb-2">Артикул: <b>{product.sku}</b></div>}

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
            <div className="text-2xl font-semibold mb-4">{product.price_dropship.toFixed(2)} ₴</div>
          )}

          {/* Опис — РЕНДЕР ЯК HTML */}
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: product.description || '' }}
          />

          {/* Тут можна розмістити твої кнопки «Додати в кошик» / «Замовити»
              і заблокувати їх, якщо !product.in_stock */}
          {/* 
          <div className="mt-6 flex gap-3">
            <button className={`btn-outline ${product.in_stock ? '' : 'opacity-50 pointer-events-none'}`} disabled={!product.in_stock}>
              Додати в кошик
            </button>
            <button className={`btn-primary ${product.in_stock ? '' : 'opacity-50 pointer-events-none'}`} disabled={!product.in_stock}>
              Замовити
            </button>
          </div>
          */}

          <div className="mt-6">
            <Link to="/" className="btn-outline">← До каталогу</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
