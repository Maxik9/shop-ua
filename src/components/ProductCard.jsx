import { Link } from 'react-router-dom'

export default function ProductCard({ product, onSelect }) {
  return (
    <div style={{border:'1px solid #eee', padding:12, borderRadius:8}}>
      <Link to={`/product/${product.id}`} style={{textDecoration:'none', color:'inherit'}}>
        {/* квадратная область */}
        <div style={{width:'100%', aspectRatio:'1 / 1', overflow:'hidden', borderRadius:6, background:'#f6f6f6'}}>
          {product.image_url && (
            <img
              src={product.image_url}
              alt={product.name}
              style={{width:'100%', height:'100%', objectFit:'cover', display:'block'}}
            />
          )}
        </div>
        <h3 style={{margin:'8px 0'}}>{product.name}</h3>
      </Link>

      <div style={{display:'flex', justifyContent:'space-between', marginTop:8}}>
        <span>Дроп-ціна: <b>{Number(product.price_dropship).toFixed(2)} ₴</b></span>
        <button onClick={() => onSelect(product)}>Обрати</button>
      </div>
    </div>
  )
}
