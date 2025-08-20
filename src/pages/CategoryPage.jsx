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
  // Працює і з :key, і з :slug (беремо те, що є)
  const { key, slug } = useParams();
  const urlKey = slug || key;

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [category, setCategory] = useState(null);
  const [parentSlug, setParentSlug] = useState(null);
  const [subcats, setSubcats] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Сортування тільки для товарів
  const [sort, setSort] = useState(searchParams.get("sort") || "alpha");
  useEffect(() => {
    setSearchParams((prev) => {
      const sp = new URLSearchParams(prev);
      sp.set("sort", sort);
      return sp;
    });
  }, [sort, setSearchParams]);

  // Кнопка "Назад": спочатку до батьківської категорії (якщо є), інакше в каталог
  const goBack = () => {
    if (parentSlug) navigate(`/category/${parentSlug}`);
    else navigate("/catalog");
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);

      // 1) Категорія: шукаємо по slug, якщо нема — по id
      const fields = "id, name, slug, image_url, parent_id";
      let { data: cat, error } = await supabase
        .from("categories")
        .select(fields)
        .eq("slug", urlKey)
        .maybeSingle();

      if (!cat && !error) {
        const byId = await supabase
          .from("categories")
          .select(fields)
          .eq("id", urlKey)
          .maybeSingle();
        cat = byId.data || null;
        error = byId.error;
      }

      if (!alive) return;

      if (error) console.error(error);
      if (!cat) {
        setCategory(null);
        setSubcats([]);
        setProducts([]);
        setParentSlug(null);
        setLoading(false);
        return;
      }

      setCategory(cat);

      // 1а) Батьківський slug (окремим запитом, щоб не ламати селект)
      if (cat.parent_id) {
        const { data: parent } = await supabase
          .from("categories")
          .select("slug")
          .eq("id", cat.parent_id)
          .maybeSingle();
        setParentSlug(parent?.slug || null);
      } else {
        setParentSlug(null);
      }

      // 2) Підкатегорії (рахунок не відображаємо в UI)
      const { data: subs, error: subErr } = await supabase.rpc(
        "get_subcategories_with_counts",
        { p_parent: cat.id }
      );
      if (subErr) console.error(subErr);

      // 3) Товари з усього піддерева + сортування (ін-сток униз вже в RPC)
      const { data: prods, error: prodErr } = await supabase.rpc(
        "get_category_products",
        { p_category: cat.id, p_sort: sort, p_limit: 1000, p_offset: 0 }
      );
      if (prodErr) console.error(prodErr);

      if (!alive) return;
      setSubcats(subs || []);
      setProducts(prods || []);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [urlKey, sort]);

  // ===================== RENDER =====================
  if (loading) {
    return (
      <div className="container-page mt-header">
        <h1 className="h1 mb-4">Завантаження…</h1>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="container-page mt-header">
        <div className="flex items-center justify-between mb-4">
          <h1 className="h1">Категорію не знайдено</h1>
          <button onClick={goBack} className="inline-flex items-center gap-2 text-sm btn-outline">
            ← Назад
          </button>
        </div>
        <div className="text-muted">Перевір, будь ласка, адресу.</div>
      </div>
    );
  }

  return (
    <div className="container-page mt-header">
      {/* Заголовок + Назад справа */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="h1">{category.name}</h1>
        <button onClick={goBack} className="inline-flex items-center gap-2 text-sm btn-outline">
          ← Назад
        </button>
      </div>

      {/* Підкатегорії (без кількості) */}
      {subcats?.length > 0 && (
        <div className="mb-6">
          <h2 className="h2 mb-3">Підкатегорії</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Сортування — тільки для товарів */}
      {products?.length > 0 && (
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
      )}

      {/* Товари */}
      <h2 className="h2 mb-3">Товари</h2>
      {products?.length === 0 ? (
        <div className="text-muted">У цій категорії поки немає товарів.</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
