import { Link } from 'react-router-dom'

export default function ProductCard({ product, onSelect }) {
  return (
    <div style={{border:'1px solid #eee', padding:12, borderRadius:8}}>
      <Link to={`/product/${product.id}`} style={{textDecoration:'none', color:'inherit'}}>
        {product.image_url && (
          <img src={product.image_url} alt={product.name} style={{width:'100%', height:160, objectFit:'cover', borderRadius:6}} />
        )}
        <h3 style={{margin:'8px 0'}}>{product.name}</h3>
      </Link>
      <p style={{color:'#555'}}>{product.description}</p>
      <div style={{display:'flex', justifyContent:'space-between', marginTop:8}}>
        <span>Дроп-ціна: <b>{Number(product.price_dropship).toFixed(2)} ₴</b></span>
      </div>
    </div>
  )
}
