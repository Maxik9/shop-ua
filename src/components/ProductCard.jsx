// src/components/ProductCard.jsx
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import AvailabilityBadge from './AvailabilityBadge'

export default function ProductCard({ product }) {
  const { addItem } = useCart()

  const add = () => {
    // якщо у твоєму контексті метод називається інакше — адаптуй тут
    addItem?.(product, 1, product.price_dropship)
  }

  return (
    <div className="card h-full flex flex-col">
      {/* фото: квадрат, однакова висота у всіх карток */}
      <Link
        to={`/product/${product.id}`}
        className="block rounded-t-2xl overflow-hidden bg-slate-100"
        aria-label={product.name}
      >
        <div className="aspect-square w-full">
          {product?.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-muted">
              Немає фото
            </div>
          )}
        </div>
      </Link>

      {/* контент */}
      <div className="card-body flex-1 flex flex-col">
        {/* назва: обмежимо до 2 рядків і зафіксуємо мінімальну висоту */}
        <Link
          to={`/product/${product.id}`}
          className="block font-semibold text-[16px] leading-snug line-clamp-2 min-h-[44px]"
          title={product.name}
        >
          {product.name}
        </Link>

        <div className="mt-1"><AvailabilityBadge in_stock={!!product.in_stock} /></div>

        {/* ціна */}
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-muted text-sm">Дроп-ціна</span>
          <span className="price font-semibold text-[17px] whitespace-nowrap">
            {(Number(product.price_dropship) || 0).toFixed(2)} ₴
          </span>
        </div>

        {/* кнопка — донизу, однакова висота, на всю ширину */}
        <button
          type="button"
          onClick={add}
          className={`btn-primary mt-3 w-full h-10 ${product.in_stock ? "" : "opacity-50 pointer-events-none"}`}
          disabled={!product.in_stock}
        >
          До кошика
        </button>
      </div>
    </div>
  )
}
