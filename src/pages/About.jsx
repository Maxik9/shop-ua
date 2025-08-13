// src/pages/About.jsx
export default function About() {
  return (
    <div className="max-w-6xl mx-auto px-3 py-6">
      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div>
          <h1 className="h1 mb-3">Про нас</h1>
          <p className="text-[15px] sm:text-[16px] leading-7 text-slate-700">
            Ми — простра платформа дропшипінгу в Україні. Даємо доступ до каталогу товарів
            з оптовими цінами, а наші клієнти можуть продавати кінцевому покупцю за своєю ціною.
            В кабінеті зручно відслідковувати статуси замовлень.
          </p>
          <p className="text-[15px] sm:text-[16px] leading-7 text-slate-700 mt-3">
            Оплата: післяплата або по реквізитам — обирає дропшипер під час оформлення.
            Відправка — Новою поштою по всій Україні.
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
          {/* будь-яке сток-зображення/логотип */}
          <div className="w-full aspect-[16/9]">
            <img
              src="https://images.unsplash.com/photo-1512295767273-ac109ac3acfa?q=80&w=1200&auto=format&fit=crop"
              alt="Dropshipping UA"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
