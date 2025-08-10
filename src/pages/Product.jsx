import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Product() {
  const { id } = useParams()
  const nav = useNavigate()
  const [product, setProduct] = useState(null)
  const [images, setImages] = useState([])
  const [i, setI] = useState(0)

  const startX = useRef(null)

  useEffect(() => {
    async function load() {
      const { data: p } = await supabase.from('products').select('*').eq('id', id).single()
      setProduct(p || null)
      const { data: imgs } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      setImages(imgs || [])
    }
    load()
  }, [id])

  const gallery = useMemo(() => {
    const cover = product?.image_url ? [{ id: 'cover', url: product.image_url }] : []
    return [...cover, ...images]
  }, [product, images])

  function prev(){ setI(v => (v-1+gallery.length)%gallery.length) }
  function next(){ setI(v => (v+1)%gallery.length) }
  function keyNav(e){ if(e.key==='ArrowLeft') prev(); if(e.key==='ArrowRight') next(); }

  function onPointerDown(e){ startX.current = e.clientX || e.touches?.[0]?.clientX }
  function onPointerUp(e){
    const endX = e.clientX || e.changedTouches?.[0]?.clientX
    if(startX.current==null || endX==null) return
    const dx = endX - startX.current
    if(Math.abs(dx) > 40){ dx>0 ? prev() : next() }
    startX.current = null
  }

  if (!product) return <div style={{padding:24}}>Завантаження…</div>

  return (
    <div style={{maxWidth:980, margin:'24px auto', display:'grid', gap:24, gridTemplateColumns:'1fr 1fr'}}>
      <div onKeyDown={keyNav} tabIndex={0} style={{outline:'none'}}>
        {/* Главное изображение: БЕЗ обрезки */}
        <div
          onMouseDown={onPointerDown}
          onMouseUp={onPointerUp}
          onTouchStart={onPointerDown}
          onTouchEnd={onPointerUp}
          style={{position:'relative'}}
        >
          <div style={{width:'100%', height:420, background:'#fff', border:'1px solid #eee', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center'}}>
            {gallery[i] && (
              <img
                src={gallery[i].url}
                alt={product.name}
                style={{maxWidth:'100%', maxHeight:'100%', objectFit:'contain'}}
              />
            )}
          </div>
          {gallery.length>1 && (
            <>
              <button onClick={prev} aria-label="prev" style={navBtnStyle('left')}>‹</button>
              <button onClick={next} aria-label="next" style={navBtnStyle('right')}>›</button>
            </>
          )}
        </div>

        {gallery.length > 1 && (
          <div style={{display:'flex', gap:8, marginTop:12, overflowX:'auto'}}>
            {gallery.map((g, idx) => (
              <div key={g.id || idx} onClick={()=>setI(idx)} style={{width:80, height:80, borderRadius:6, border: idx===i ? '2px solid #333':'1px solid #ddd', overflow:'hidden', cursor:'pointer', background:'#f6f6f6'}}>
                <img src={g.url} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 style={{marginTop:0}}>{product.name}</h2>
        {product.description && <p style={{color:'#555'}}>{product.description}</p>}
        <div style={{fontSize:18, margin:'12px 0'}}>Дроп-ціна: <b>{Number(product.price_dropship).toFixed(2)} ₴</b></div>
        <button onClick={()=>nav('/new-order', { state: { product } })} style={{padding:'10px 16px'}}>Замовити</button>
      </div>
    </div>
  )
}

function navBtnStyle(side){
  return {
    position:'absolute', top:'50%', [side]:8, transform:'translateY(-50%)',
    background:'#fff', border:'1px solid #ddd', borderRadius:999, width:36, height:36,
    cursor:'pointer'
  }
}
