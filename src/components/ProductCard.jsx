// src/components/ProductCard.jsx
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'

export default function ProductCard({ product }) {
  const cart = useCart()

  function addToCart() {
    // Підтримує різні назви методів у твоєму CartContext,
    // щоб не ламати поточну реалізацію.
    if (cart?.addItem) {
      cart.addItem(product, 1)
    } else if (cart?.add) {
      cart.add(product)
    } else if (cart?.addProduct) {
      cart.addProduct(product)
    }
  }

  return (
    <div className="card h-full flex flex-col">
      {/* === Клік по ЗОБРАЖЕННЮ відкриває картку товару === */}
      <Link
        to={`/product/${product.id}`}
        className="block rounded-t-xl overflow-hidden bg-slate-100"
        aria-label={product.name}
      >
        <div className="aspect-square w-full">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-slate-400">
              Немає фото
            </div>
          )}
        </div>
      </Link>

      <div className="card-body flex flex-col gap-3">
        {/* === Клік по НАЗВІ теж відкриває картку === */}
        <Link
          to={`/product/${product.id}`}
          className="font-medium text-slate-900 hover:text-indigo-700 line-clamp-2"
        >
          {product.name}
        </Link>

        <div className="mt-auto flex items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            Дроп-ціна:{' '}
            <span className="price font-semibold text-slate-900">
              {(Number(product.price_dropship) || 0).toFixed(2)} ₴
            </span>
          </div>

          <button
            type="button"
            className="btn-primary whitespace-nowrap"
            onClick={addToCart}
          >
            До кошика
          </button>
        </div>
      </div>
    </div>
  )
}
