import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'

export default function ProductCard({ product }) {
  const { addItem } = useCart()

  function add() {
    addItem(product, 1, product.price_dropship)
  }

  return (
    <div className="card h-full flex flex-col">
      {/* фото 1:1 */}
      <div className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-100">
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

      {/* контент */}
      <div className="card-body flex-1 flex flex-col">
        {/* назва: до 2х рядків, однакова висота */}
        <Link
          to={`/product/${product.id}`}
          className="block font-semibold text-[18px] leading-snug line-clamp-2 min-h-[48px]"
          title={product.name}
        >
          {product.name}
        </Link>

        {/* ціна: вирівняно по базовій лінії, валюта не “стрибає” */}
        <div className="mt-2 flex items-baseline justify-between">
          <div className="text-muted">Дроп-ціна:</div>
          <div className="font-semibold text-[18px] whitespace-nowrap">
            {(Number(product.price_dropship) || 0).toFixed(2)}{' '}
            <span className="text-slate-500">₴</span>
          </div>
        </div>

        {/* кнопка: завжди рівно, на мобайлі повна ширина */}
        <button
          onClick={add}
          className="btn-primary mt-3 w-full sm:w-auto self-start"
        >
          До кошика
        </button>
      </div>
    </div>
  )
}
