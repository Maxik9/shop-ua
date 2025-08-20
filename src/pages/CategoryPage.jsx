// src/pages/CategoryPage.jsx
import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import ProductCard from "../components/ProductCard";

const SORT_OPTIONS = [
  { value: "alpha", label: "За алфавітом" },
  { value: "price_asc", label: "Ціна: за зростанням" },
  { value: "price_desc", label: "Ціна: за спаданням" },
  { value: "popular", label: "Популярні" },
];

export default function CategoryPage() {
  const { key } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [category, setCategory]   = useState(null);
  const [subcats, setSubcats]     = useState([]);
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);

  const [sort, setSort] = useState(searchParams.get("sort") || "alpha");
  useEffect(() => {
    setSearchParams(prev => {
      const sp = new URLSearchParams(prev);
      sp.set("sort", sort);
      return sp;
    });
  }, [sort, setSearchParams]);

  const goBack = () => {
    // якщо є попередні сторінки — йдемо назад
    if (window.history.length > 2) navigate(-1);
    // fallback — на головну (або "/catalog")
    else navigate("/catalog");
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);

      const bySlug = await supabase
        .from("categories")
        .select("id, name, slug, image_url")
        .eq("slug", key)
        .maybeSingle();

      let cat = bySlug.data;
      if (!cat) {
        const byId = await supabase
          .from("categories")
          .select("id, name, slug, image_url")
          .eq("id", key)
          .maybeSingle();
        cat = byId.data || null;
      }
      if (!alive) return;

      if (!cat) {
        setCategory(null);
        setSubcats([]);
        setProducts([]);
        setLoading(false);
        return;
      }
      setCategory(cat);

      const { data: subs } = await supabase.rpc(
        "get_subcategories_with_counts",
        { p_parent: cat.id }
      );

      const { data: prods } = await supabase.rpc("get_category_products", {
        p_category: cat.id,
        p_sort: sort,
        p_limit: 1000,
        p_offset: 0,
      });

      if (!alive) return;
      setSubcats(subs || []);
      setProducts(prods || []);
      setLoading(false);
    })();

    return () => { alive = false; };
  }, [key, sort]);

  if (loading) {
    return (
      <div className="container-page pt-24">
        <h1 className="h1 mb-4">Завантаження…</h1>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="container-page pt-24">
        <button onClick={goBack} className="inline-flex items-center gap-2 text-sm btn-outline mb-4">
          ← Назад
        </button>
        <h1 className="h1 mb-2">Категорію не знайдено</h1>
        <div className="text-muted">Перевір, будь ласка, адресу.</div>
      </div>
    );
  }

  return (
    <div className="container-page pt-24">
      {/* Заголовок + Назад */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="h1">{category.name}</h1>
        <button onClick={goBack} className="inline-flex items-center gap-2 text-sm btn-outline">
          ← Назад
        </button>
      </div>

      {/* Підкатегорії */}
      {subcats?.length > 0 && (
        <div className="mb-6">
          <h2 className="h2 mb-3">Підкатегорії</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {subcats.map(c => (
              <Link
                key={c.id}
                to={`/category/${c.slug || c.id}`}
                className="card hover:shadow-md transition"
              >
                <div className="card-body">
                  <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden mb-3">
                    {c.image_url && (
                      <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
                    )}
                  </div>
                  <div className="font-medium">{c.name}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Сортування */}
      <div className="flex items-center justify-end mb-3">
        <label className="text-sm text-gray-600 mr-2">Сортувати товари:</label>
        <select
          className="border rounded px-3 py-2 text-sm"
          value={sort}
          onChange={e => setSort(e.target.value)}
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Товари */}
      <h2 className="h2 mb-3">Товари</h2>
      {products?.length === 0 ? (
        <div className="text-muted">У цій категорії поки немає товарів.</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
