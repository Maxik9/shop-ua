import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'

export default function ProductCard({ product }) {
  const { add } = useCart()

  const card = {background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, boxShadow:'0 1px 2px rgba(0,0,0,.04)', overflow:'hidden'}
  const body = {padding:12}
  const btn  = {height:36, padding:'0 12px', borderRadius:8, background:'#4f46e5', color:'#fff', border:'none', cursor:'pointer'}

  return (
    <div style={card}>
      <Link to={`/product/${product.id}`} style={{display:'block'}}>
        <div style={{width:'100%', aspectRatio:'1 / 1', background:'#f1f5f9', overflow:'hidden'}}>
          {product.image_url && (
            <img src={product.image_url} alt={product.name} style={{width:'100%', height:'100%', objectFit:'cover'}} />
          )}
        </div>
      </Link>
      <div style={body}>
        <Link to={`/product/${product.id}`} style={{textDecoration:'none', color:'#111827'}}>
          <h3 style={{margin:'0 0 8px 0', fontWeight:600}}>{product.name}</h3>
        </Link>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <span style={{fontSize:14, color:'#6b7280'}}>
            Дроп-ціна: <b style={{color:'#111827'}}>{Number(product.price_dropship).toFixed(2)} ₴</b>
          </span>
          <button onClick={() => add(product)} style={btn}>До кошика</button>
        </div>
      </div>
    </div>
  )
}
