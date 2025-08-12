import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'

export default function ProductCard({ product }) {
  const { add } = useCart()

  return (
    <div className="card overflow-hidden">
      <Link to={`/product/${product.id}`} className="block">
        <div className="w-full aspect-square bg-slate-100">
          {product.image_url && (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      </Link>

      <div className="card-body">
        <Link to={`/product/${product.id}`} className="block">
          <h3 className="font-semibold text-[16px] leading-5 line-clamp-2 min-h-[40px]">
            {product.name}
          </h3>
        </Link>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-muted text-[14px]">
            Дроп-ціна:{' '}
            <b className="price text-[16px] text-slate-900">
              {Number(product.price_dropship).toFixed(2)} ₴
            </b>
          </span>

          <button onClick={() => add(product)} className="btn-primary">
            До кошика
          </button>
        </div>
      </div>
    </div>
  )
}
