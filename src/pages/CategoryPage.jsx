import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Product from "./Product";

export default function CategoryPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [category, setCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [sort, setSort] = useState("name");

  useEffect(() => {
    async function fetchData() {
      const res = await fetch(`/api/categories/${slug}`);
      const data = await res.json();
      setCategory(data.category);
      setSubcategories(data.subcategories || []);
      setProducts(data.products || []);
    }
    fetchData();
  }, [slug]);

  const sortedProducts = [...products].sort((a, b) => {
    if (sort === "price") return a.price - b.price;
    if (sort === "popular") return b.orders - a.orders;
    return a.name.localeCompare(b.name);
  });

  const backToCategory = () => navigate(-1);

  return (
    <div className="container-page mt-header py-4 sm:py-6">
      {/* Назад */}
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={backToCategory}
          className="inline-flex items-center gap-2 text-sm btn-outline"
        >
          ← Назад
        </button>
      </div>

      {/* Назва категорії */}
      {category && (
        <h1 className="text-2xl font-bold mb-4">{category.name}</h1>
      )}

      {/* Підкатегорії */}
      {subcategories.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
          {subcategories.map((sub) => (
            <div
              key={sub.id}
              onClick={() => navigate(`/category/${sub.slug}`)}
              className="card hover:shadow-md cursor-pointer transition p-4 flex items-center justify-center text-center font-medium"
            >
              {sub.name}
            </div>
          ))}
        </div>
      )}

      {/* Сортування */}
      {products.length > 0 && (
        <div className="flex justify-end mb-4">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="name">За алфавітом</option>
            <option value="price">За ціною</option>
            <option value="popular">За популярністю</option>
          </select>
        </div>
      )}

      {/* Товари */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {sortedProducts.map((product) => (
          <Product key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
