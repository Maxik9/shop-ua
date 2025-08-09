import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Product() {
  const { id } = useParams()
  const nav = useNavigate()
  const [product, setProduct] = useState(null)
  const [images, setImages] = useState([])
  const [active, setActive] = useState(0)

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
    const base = product?.image_url ? [{ id: 'cover', url: product.image_url }] : []
    return [...base, ...images]
  }, [product, images])

  if (!product) return <div style={{padding:24}}>Завантаження…</div>

  function orderNow() {
    nav('/new-order', { state: { product } })
  }

  return (
    <div style={{maxWidth:980, margin:'24px auto', display:'grid', gap:24, gridTemplateColumns:'1fr 1fr'}}>
      <div>
        {gallery[active] ? (
          <img
            src={gallery[active].url}
            alt={product.name}
            style={{width:'100%', height:420, objectFit:'cover', borderRadius:8}}
          />
        ) : (
          <div style={{width:'100%', height:420, background:'#f5f5f5', borderRadius:8}}/>
        )}

        {gallery.length > 1 && (
          <div style={{display:'flex', gap:8, marginTop:12, overflowX:'auto'}}>
            {gallery.map((g, i) => (
              <img
                key={g.id || i}
                src={g.url}
                alt=""
                onClick={() => setActive(i)}
                style={{
                  width:88, height:70, objectFit:'cover', border: i===active ? '2px solid #333' : '1px solid #ddd',
                  borderRadius:6, cursor:'pointer'
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 style={{marginTop:0}}>{product.name}</h2>
        {product.description && <p style={{color:'#555'}}>{product.description}</p>}
        <div style={{fontSize:18, margin:'12px 0'}}>Дроп-ціна: <b>{Number(product.price_dropship).toFixed(2)} ₴</b></div>
        <button onClick={orderNow} style={{padding:'10px 16px'}}>Замовити</button>
      </div>
    </div>
  )
}
