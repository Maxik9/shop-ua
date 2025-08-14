import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";

export default function Product({ products }) {
  const { id } = useParams();
  const product = products.find((p) => p.id === id);
  const [mainImage, setMainImage] = useState(product.images[0]);

  if (!product) {
    return <div className="p-4">Товар не знайдено</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Кнопка до каталогу */}
      <div className="mb-4">
        <Link
          to="/"
          className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 inline-block"
        >
          ← До каталогу
        </Link>
      </div>

      {/* Галерея */}
      <div className="relative w-full overflow-hidden">
        <img
          src={mainImage}
          alt={product.name}
          className="w-full h-auto rounded-lg object-contain"
        />

        {/* Навігація по фото */}
        <button
          onClick={() => {
            const idx = product.images.indexOf(mainImage);
            const prevIdx = (idx - 1 + product.images.length) % product.images.length;
            setMainImage(product.images[prevIdx]);
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 rounded-full px-2 py-1"
        >
          ‹
        </button>
        <button
          onClick={() => {
            const idx = product.images.indexOf(mainImage);
            const nextIdx = (idx + 1) % product.images.length;
            setMainImage(product.images[nextIdx]);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 rounded-full px-2 py-1"
        >
          ›
        </button>
      </div>

      {/* Мініатюри (горизонтальний скрол) */}
      <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
        {product.images.map((img, i) => (
          <img
            key={i}
            src={img}
            alt=""
            onClick={() => setMainImage(img)}
            className={`h-20 w-20 object-cover rounded cursor-pointer border ${
              img === mainImage ? "border-blue-500" : "border-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Інфо про товар */}
      <h1 className="text-xl font-bold mt-4">{product.name}</h1>
      <p className="text-gray-500">Артикул: {product.sku}</p>
      <div className="text-green-600 font-semibold mt-1">{product.availability}</div>
      <div className="text-2xl font-bold mt-2">{product.price} ₴</div>

      {/* Кнопки */}
      <div className="mt-4 flex flex-col gap-2">
        <button className="border py-2 rounded hover:bg-gray-100">
          Додати в кошик
        </button>
        <button className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          Замовити
        </button>
      </div>

      {/* Опис товару */}
      <div className="mt-6 p-4 bg-white rounded-lg shadow">
        <div
          dangerouslySetInnerHTML={{ __html: product.description }}
          className="prose max-w-none"
        />
      </div>
    </div>
  );
}
