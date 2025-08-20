// src/pages/CategoryPage.jsx
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

// імпорт твоєї готової картки товару
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
  const { key } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [category, setCategory] = useState(null);
  const [subcats, setSubcats] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const sortParam = searchParams.get("sort") || "alpha";
  const [sort, setSort] = useState(sortParam);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      // шукаємо категорію по slug
      const { data: found, error } = await supabase
        .from("categories")
        .select("id, name, slug, image_url")
        .eq("slug", key)
        .maybeSingle();

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }
      if (!found) {
        setCategory(null);
        setLoading(false);
        return;
      }
      setCategory(found);

      // підкатегорії
      const { data: subs } = await supabase.rpc(
        "get_subcategories_with_counts",
        { p_parent: found.id }
      );

      // товари
      const { data: prods } = await supabase.rpc("get_category_products", {
        p_category: found.id,
        p_sort: sort,
        p_limit: 1000,
        p_offset: 0,
      });

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

  if (loading) return <div className="container-page">Завантаження…</div>;
  if (!category) return <div className="container-page">Категорію не знайдено</div>;

  return (
    <div className="container-page my-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="h1">{category.name}</h1>
        <select
          className="border rounded px-3 py-1"
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

      {/* підкатегорії */}
      {subcats?.length > 0 && (
        <div className="mb-8">
          <h2 className="h2 mb-3">Підкатегорії</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {subcats.map((c) => (
              <a
                key={c.id}
                href={`/category/${c.slug || c.id}`}
                className="card hover:shadow-md transition"
              >
                <div className="card-body">
                  <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden mb-3">
                    {c.image_url && (
                      <img
                        src={c.image_url}
                        alt={c.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-sm text-gray-500">{c.product_count} товарів</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* товари */}
      <h2 className="h2 mb-3">Товари</h2>
      {products?.length === 0 ? (
        <div className="text-muted">Немає товарів</div>
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
