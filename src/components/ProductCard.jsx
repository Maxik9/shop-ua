// src/components/ProductCard.jsx
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import AvailabilityBadge from './AvailabilityBadge'

export default function ProductCard({ product }) {
  const { addItem } = useCart()
  if (!product) return null

  const img =
    product.image_url ||
    (Array.isArray(product.gallery_json) ? product.gallery_json[0] : '') ||
    ''

  const inStock = product.in_stock ?? true
  const price = Number(product.price_dropship || 0) || 0

  const add = () => addItem?.(product, 1, price)

  return (
    <div className="card h-full flex flex-col">
      {/* Фото */}
      <Link to={`/product/${product.id}`} className="block">
        <div className="w-full aspect-square bg-white rounded-t-2xl overflow-hidden">
          {img ? (
            <img src={img} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted">Немає фото</div>
          )}
        </div>
      </Link>

      {/* Контент */}
      <div className="card-body flex flex-col flex-1">
        <Link
          to={`/product/${product.id}`}
          className="font-semibold leading-snug hover:text-indigo-600 mb-2 line-clamp-2 min-h-[3rem]"
          title={product.name}
        >
          {product.name}
        </Link>

        <div className="mb-2">
          <AvailabilityBadge in_stock={!!inStock} />
        </div>

        <div className="text-muted text-sm">Дроп-ціна</div>
        <div className="text-lg font-semibold mb-2">{price.toFixed(2)} ₴</div>

        {/* Кнопка — завжди внизу */}
        <div className="mt-auto pt-2">
          <button
            onClick={add}
            className={`btn-primary w-full ${inStock ? '' : 'opacity-50 pointer-events-none'}`}
            disabled={!inStock}
          >
            До кошика
          </button>
        </div>
      </div>
    </div>
  )
}
