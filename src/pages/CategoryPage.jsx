// src/pages/CategoryPage.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import ProductCard from "../components/ProductCard";

const SORT_OPTIONS = [
  { value: "alpha", label: "За алфавітом" },
  { value: "price_asc", label: "Ціна: за зростанням" },
  { value: "price_desc", label: "Ціна: за спаданням" },
  { value: "popular", label: "Популярні" },
];

export default function CategoryPage() {
  // Працюємо і з :key, і з :slug — беремо те, що прийшло з роутера
  const { key, slug } = useParams();
  const param = slug ?? key; // важливо: не буде undefined

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [category, setCategory] = useState(null);
  const [parentSlug, setParentSlug] = useState(null);
  const [subcats, setSubcats] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // sort з URL; тримаємо джерелом істини саме URL
  const sort = searchParams.get("sort") || "alpha";

  // Записуємо нове сортування в URL (push у історію)
  const onChangeSort = (e) => {
    const next = e.target.value;
    const params = new URLSearchParams(searchParams);
    params.set("sort", next);
    setSearchParams(params, { replace: false });
  };

  // Кнопка "Назад": якщо є історія — крок назад; інакше на головну
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      // Якщо параметра немає взагалі — показуємо "не знайдено"
      if (!param) {
        setCategory(null);
        setSubcats([]);
        setProducts([]);
        setParentSlug(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      // 1) знайти категорію по slug (основний кейс),
      //    якщо не знайшли — пробуємо сприймати як id (fallback)
      const fields = "id, name, slug, image_url, parent_id";
      let { data: cat, error } = await supabase
        .from("categories")
        .select(fields)
        .eq("slug", param)
        .maybeSingle();

      if (!cat && !error) {
        const byId = await supabase
          .from("categories")
          .select(fields)
          .eq("id", param)
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

      // 1а) батьківська категорія (для навігації «Назад» у твоєму UX)
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

      // 2) підкатегорії з кількістю товарів (враховуючи піддерево)
      const { data: subs, error: e1 } = await supabase.rpc(
        "get_subcategories_with_counts",
        { p_parent: cat.id }
      );
      if (e1) console.error(e1);

      // 3) товари категорії + всіх її підкатегорій
      const { data: prods, error: e2 } = await supabase.rpc(
        "get_category_products",
        { p_category: cat.id, p_sort: sort, p_limit: 1000, p_offset: 0 }
      );
      if (e2) console.error(e2);

      if (!alive) return;
      setSubcats(subs || []);
      setProducts(prods || []);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
    // перевантажуємо при зміні slug/key або сортування
  }, [param, sort]);

  // --------- RENDER ---------
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
        <div className="text-muted">Перевірте адресу або поверніться на головну.</div>
      </div>
    );
  }

  return (
    <div className="container-page mt-header">
      {/* Твоя верхня панель: заголовок зліва, «Назад» справа */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="h1">{category.name}</h1>
        <button onClick={goBack} className="inline-flex items-center gap-2 text-sm btn-outline">
          ← Назад
        </button>
      </div>

      {/* Підкатегорії — твої класи/сітка збережені */}
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

      {/* Панель сортування справа — тільки логіка оновлена */}
      {products?.length > 0 && (
        <div className="flex items-center justify-end mb-3">
          <label className="text-sm text-gray-600 mr-2">Сортувати товари:</label>
          <select
            className="border rounded px-3 py-2 text-sm"
            value={sort}
            onChange={onChangeSort}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

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
