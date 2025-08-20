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
  const { key } = useParams();               // slug (або id — якщо десь ще є старі посилання)
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [category, setCategory]   = useState(null);
  const [subcats, setSubcats]     = useState([]);
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);

  // сортування ТІЛЬКИ для товарів
  const [sort, setSort] = useState(searchParams.get("sort") || "alpha");
  useEffect(() => {
    setSearchParams(prev => {
      const sp = new URLSearchParams(prev);
      sp.set("sort", sort);
      return sp;
    });
  }, [sort, setSearchParams]);

  // кнопка «Назад»: якщо нема історії — ведемо на головну (або постав "/catalog", якщо хочеш)
  const goBack = () => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate("/");
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);

      // 1) шукаємо категорію по slug (fallback — по id)
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

      // 2) підкатегорії (лічильники не показуємо в UI)
      const { data: subs } = await supabase.rpc(
        "get_subcategories_with_counts",
        { p_parent: cat.id }
      );

      // 3) товари з урахуванням всього піддерева + сортування
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
      <div className="container-page my-6">
        <h1 className="h1 mb-4">Завантаження…</h1>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="container-page my-6">
        <button onClick={goBack} className="inline-flex items-center gap-2 text-sm btn-outline mb-4">
          ← Назад
        </button>
        <h1 className="h1 mb-2">Категорію не знайдено</h1>
        <div className="text-muted">Перевір, будь ласка, адресу.</div>
      </div>
    );
  }

  return (
    <div className="container-page my-6">
      {/* Заголовок + Назад */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="h1">{category.name}</h1>
        <button onClick={goBack} className="inline-flex items-center gap-2 text-sm btn-outline">
          ← Назад
        </button>
      </div>

      {/* Підкатегорії (картки у твоєму стилі; без кількості) */}
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

      {/* Сортування — нижче підкатегорій, стосується лише товарів */}
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

      {/* Товари (картка з твого проекту) */}
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
