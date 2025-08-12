// src/pages/Product.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useCart } from '../context/CartContext'

export default function Product() {
  const { id } = useParams()
  const nav = useNavigate()
  const { add } = useCart()

  const [product, setProduct] = useState(null)
  const [images, setImages] = useState([])
  const [index, setIndex] = useState(0)
  const startX = useRef(null)

  useEffect(() => {
    async function load() {
      const { data: p, error: pe } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()
      if (pe) { console.warn(pe); return }
      setProduct(p)

      const { data: imgs, error: ie } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (ie) { console.warn(ie) }
      setImages(imgs || [])
      setIndex(0)
    }
    load()
  }, [id])

  const gallery = useMemo(() => {
    const cover = product?.image_url ? [{ id: 'cover', url: product.image_url }] : []
    return [...cover, ...images]
  }, [product, images])

  function prev() {
    if (gallery.length) setIndex(v => (v - 1 + gallery.length) % gallery.length)
  }
  function next() {
    if (gallery.length) setIndex(v => (v + 1) % gallery.length)
  }
  function keyNav(e) {
    if (e.key === 'ArrowLeft') prev()
    if (e.key === 'ArrowRight') next()
  }

  function onPointerDown(e) {
    startX.current = e.clientX ?? e.touches?.[0]?.clientX ?? null
  }
  function onPointerUp(e) {
    const endX = e.clientX ?? e.changedTouches?.[0]?.clientX ?? null
    if (startX.current == null || endX == null) return
    const dx = endX - startX.current
    if (Math.abs(dx) > 40) { dx > 0 ? prev() : next() }
    startX.current = null
  }

  if (!product) return <div style={{ padding: 24 }}>Завантаження…</div>

  function addToCart() { add(product) }

  return (
    <div style={{ maxWidth: 980, margin: '24px auto', padding: '0 12px', display: 'grid', gap: 24, gridTemplateColumns: '1fr 1fr' }}>
      {/* ГАЛЕРЕЯ */}
      <div onKeyDown={keyNav} tabIndex={0} style={{ outline: 'none' }}>
        <div
          onMouseDown={onPointerDown}
          onMouseUp={onPointerUp}
          onTouchStart={onPointerDown}
          onTouchEnd={onPointerUp}
          style={{ position: 'relative' }}
        >
          <div style={{
            width: '100%', height: 420, background: '#fff',
            border: '1px solid #eee', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {gallery[index] ? (
              <img
                src={gallery[index].url}
                alt={product.name}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: '#f6f6f6', borderRadius: 8 }} />
            )}
          </div>

          {gallery.length > 1 && (
            <>
              <button aria-label="Попереднє фото" onClick={prev} style={navBtnStyle('left')}>‹</button>
              <button aria-label="Наступне фото" onClick={next} style={navBtnStyle('right')}>›</button>
            </>
          )}
        </div>

        {gallery.length > 1 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, overflowX: 'auto' }}>
            {gallery.map((g, i) => (
              <div
                key={g.id || i}
                onClick={() => setIndex(i)}
                style={{
                  width: 80, height: 80, borderRadius: 6, overflow: 'hidden',
                  border: i === index ? '2px solid #333' : '1px solid #ddd',
                  cursor: 'pointer', background: '#f6f6f6'
                }}
                title="Натисніть, щоб переглянути"
              >
                <img src={g.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ІНФО + КНОПКИ */}
      <div>
        <h2 style={{ marginTop: 0 }}>{product.name}</h2>
        {product.description && <p style={{ color: '#555' }}>{product.description}</p>}
        <div style={{ fontSize: 18, margin: '12px 0' }}>
          Дроп-ціна: <b>{Number(product.price_dropship).toFixed(2)} ₴</b>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
  <button onClick={addToCart} style={{ padding: '10px 16px' }}>Додати в кошик</button>
  <button onClick={() => { addToCart(); nav('/cart') }} style={{ padding: '10px 16px' }}>Замовити</button>
</div>
      </div>
    </div>
  )
}

function navBtnStyle(side) {
  return {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    [side]: 8,
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: 999,
    width: 36,
    height: 36,
    cursor: 'pointer',
    lineHeight: '32px',
    fontSize: 20,
    userSelect: 'none'
  }
}
