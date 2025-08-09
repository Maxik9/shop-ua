export default function ProductCard({ product, onSelect }) {
  return (
    <div style={{border:'1px solid #eee', padding:12, borderRadius:8}}>
      {product.image_url && (
        <img src={product.image_url} alt={product.name} style={{width:'100%', height:160, objectFit:'cover', borderRadius:6}} />
      )}
      <h3 style={{margin:'8px 0'}}>{product.name}</h3>
      <p style={{color:'#555'}}>{product.description}</p>
      <div style={{display:'flex', justifyContent:'space-between', marginTop:8}}>
        <span>Дроп‑ціна: <b>{Number(product.price_dropship).toFixed(2)} ₴</b></span>
        <button onClick={() => onSelect(product)}>Обрати</button>
      </div>
    </div>
  )
}