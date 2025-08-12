import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'

export default function ProductCard({ product }) {
  const { add } = useCart()
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <Link to={`/product/${product.id}`} className="block">
        <div className="w-full aspect-square bg-slate-100">
          {product.image_url && (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          )}
        </div>
      </Link>
      <div className="p-4">
        <Link to={`/product/${product.id}`} className="block">
          <h3 className="font-semibold">{product.name}</h3>
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-slate-600">
            Дроп-ціна: <b className="text-slate-900">{Number(product.price_dropship).toFixed(2)} ₴</b>
          </span>
          <button onClick={() => add(product)} className="inline-flex items-center justify-center rounded-lg px-4 h-9 text-sm bg-indigo-600 text-white hover:bg-indigo-700">
            До кошика
          </button>
        </div>
      </div>
    </div>
  )
}
