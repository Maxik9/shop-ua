// src/pages/CategoryPage.jsx
import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import ProductCard from "../components/ProductCard";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const SORT_OPTIONS = [
  { value: "alpha", label: "За алфавітом" },
  { value: "price_asc", label: "Ціна: за зростанням" },
  { value: "price_desc", label: "Ціна: за спаданням" },
  { value: "popular", label: "Популярні" },
];

export default function CategoryPage() {
  const { key } = useParams(); // slug (або id як fallback)
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [category, setCategory] = useState(null);
  const [subcats, setSubcats] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // сортування — ТІЛЬКИ для товарів
  const [sort, setSort] = useState(searchParams.get("sort") || "alpha");
  useEffect(() => {
    setSearchParams((prev) => {
      const sp = new URLSearchParams(prev);
      sp.set("sort", sort);
      return sp;
    });
  }, [sort, setSearchParams]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      // категорія по slug
      const { data: cat, error: catErr } = await supabase
        .from("categories")
        .select("id, name, slug, image_url")
        .eq("slug", key)
        .maybeSingle();

      if (catErr) {
        console.error(catErr);
        setLoading(false);
        return;
      }
      if (!cat) {
        setCategory(null);
        setLoading(false);
        return;
      }
      setCategory(cat);

      // підкатегорії (без показу кількості в UI)
      const { data: subs, error: subErr } = await supabase.rpc(
        "get_subcategories_with_counts",
        { p_parent: cat.id }
      );
      if (subErr) console.error(subErr);

      // товари з урахуванням сортування
      const { data: prods, error: prodErr } = await supabase.rpc(
        "get_category_products",
        { p_category: cat.id, p_sort: sort, p_limit: 1000, p_offset: 0 }
      );
      if (prodErr) console.error(prodErr);

      if (mounted) {
        setSubcats(subs || []);
        setProducts(prods || []);
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [key, sort]);

  if (loading) {
    return (
      <div className="container-page my-6">
        <h1 className="h1 mb-4">Завантаження…</h1>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="container-page my-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded border hover:bg-gray-50 mb-4"
        >
          ← Назад
        </button>
        <h1 className="h1 mb-2">Категорію не знайдено</h1>
        <div className="text-muted">Перевір, будь ласка, адресу.</div>
      </div>
    );
  }

  return (
    <div className="container-page my-6">
      {/* Заголовок + кнопка назад */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="h1">{category.name}</h1>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded border hover:bg-gray-50"
        >
          ← Назад
        </button>
      </div>

      {/* Підкатегорії (без кількості в підписі) */}
      {subcats?.length > 0 && (
        <div className="mb-8">
          <h2 className="h2 mb-3">Підкатегорії</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {subcats.map((c) => (
              <Link
                key={c.id}
                to={`/category/${c.slug || c.id}`}
                className="card hover:shadow-md transition"
              >
                <div className="card-body">
                  <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden mb-3">
                    {c.image_url && (
                      <img
                        src={c.image_url}
                        alt={c.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="font-medium">{c.name}</div>
                  {/* кількість НЕ показуємо */}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Сортування — нижче підкатегорій, стосується лише товарів */}
      <div className="flex items-center justify-end mb-3">
        <label className="text-sm text-gray-600 mr-2">Сортувати товари:</label>
        <select
          className="border rounded px-3 py-2 text-sm"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Товари */}
      <h2 className="h2 mb-3">Товари</h2>
      {products?.length === 0 ? (
        <div className="text-muted">У цій категорії поки немає товарів.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
