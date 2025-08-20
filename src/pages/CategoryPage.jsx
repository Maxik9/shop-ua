// src/pages/CategoryPage.jsx
import { useEffect, useState, useCallback } from "react";
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

  // сортування (лише для товарів)
  const [sort, setSort] = useState(searchParams.get("sort") || "alpha");
  useEffect(() => {
    setSearchParams(prev => {
      const sp = new URLSearchParams(prev);
      sp.set("sort", sort);
      return sp;
    });
  }, [sort, setSearchParams]);

  // Надійна кнопка "Назад": історія → батьківська категорія → каталог
  const goBack = useCallback(() => {
    try {
      const ref = document.referrer;
      const sameOrigin = ref && new URL(ref).origin === window.location.origin;
      if (sameOrigin && window.history.length > 1) {
        navigate(-1);
        return;
      }
    } catch (_) {
      /* ignore URL parse errors */
    }
    // якщо є батьківська категорія — ведемо до неї
    if (category?.parent?.slug) {
      navigate(`/category/${category.parent.slug}`);
    } else if (category?.parent_id) {
      // на всяк випадок, якщо slug відсутній
      navigate("/catalog");
    } else {
      navigate("/catalog");
    }
  }, [navigate, category]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);

      // 1) шукаємо категорію по slug (fallback — по id)
      // + підтягуємо parent через self-reference FK (categories_parent_id_fkey)
      const selectFields =
        "id, name, slug, image_url, parent_id, parent:categories!categories_parent_id_fkey(slug)";
      const bySlug = await supabase
        .from("categories")
        .select(selectFields)
        .eq("slug", key)
        .maybeSingle();

      let cat = bySlug.data;
      if (!cat) {
        const byId = await supabase
          .from("categories")
          .select(selectFields)
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

      // 2) підкатегорії (лічильники не показуємо — тільки дані)
      const { data: subs } = await supabase.rpc(
        "get_subcategories_with_counts",
        { p_parent: cat.id }
      );

      // 3) товари з урахуванням піддерева + сортування
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
      <div className="container-page">
        <div className="pt-8 md:pt-10">
          <h1 className="h1 mb-4">Завантаження…</h1>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="container-page">
        <div className="pt-8 md:pt-10">
          <button onClick={goBack} className="inline-flex items-center gap-2 text-sm btn-outline mb-4">
            ← Назад
          </button>
          <h1 className="h1 mb-2">Категорію не знайдено</h1>
          <div className="text-muted">Перевір, будь ласка, адресу.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page">
      <div className="pt-8 md:pt-10">
        {/* Заголовок + Назад */}
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
              {subcats.map(c => (
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
    </div>
  );
}
