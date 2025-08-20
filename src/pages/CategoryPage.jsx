import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

// Створюємо клієнт (без залежності від твоїх хелперів)
// Якщо у тебе вже є готовий supabase-клієнт — можеш імпортувати його замість цього блоку.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SORT_OPTIONS = [
  { value: "alpha", label: "За алфавітом" },        // default
  { value: "price_asc", label: "Ціна: за зростанням" },
  { value: "price_desc", label: "Ціна: за спаданням" },
  { value: "popular", label: "Популярні" },
];

export default function CategoryPage() {
  // очікуємо, що у роуті використовується слаг категорії: /category/:slug
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [category, setCategory] = useState(null);
  const [subcats, setSubcats] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // сортування зберігаємо в URL ?sort=...
  const sortParam = searchParams.get("sort");
  const [sort, setSort] = useState(sortParam || "alpha");

  useEffect(() => {
    if (!sortParam) {
      setSearchParams({ sort: "alpha" }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      // 1) шукаємо категорію по slug
      const { data: cat, error: catErr } = await supabase
        .from("categories")
        .select("id, name, slug, image_url, parent_id")
        .eq("slug", slug)
        .maybeSingle();

      if (catErr) {
        console.error(catErr);
        setCategory(null);
        setLoading(false);
        return;
      }
      if (!cat) {
        setCategory(null);
        setSubcats([]);
        setProducts([]);
        setLoading(false);
        return;
      }

      if (!mounted) return;

      setCategory(cat);

      // 2) підкатегорії з лічильниками
      const { data: subs, error: subErr } = await supabase.rpc(
        "get_subcategories_with_counts",
        { p_parent: cat.id }
      );
      if (subErr) console.error(subErr);

      // 3) товари всієї піддереви з вибраним сортуванням
      const { data: prods, error: prodErr } = await supabase.rpc(
        "get_category_products",
        {
          p_category: cat.id,
          p_sort: sort, // 'alpha' | 'price_asc' | 'price_desc' | 'popular'
          p_limit: 1000,
          p_offset: 0,
        }
      );
      if (prodErr) console.error(prodErr);

      if (!mounted) return;
      setSubcats(subs || []);
      setProducts(prods || []);
      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, [slug, sort]);

  const title = useMemo(() => category?.name || "Категорія", [category]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">{title}</h1>
        <div>Завантаження…</div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Категорію не знайдено</h1>
        <p className="text-gray-600">Перевір, будь ласка, адресу.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Заголовок */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>

        {/* Сортування */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Сортувати:</label>
          <select
            className="border rounded-md px-3 py-2 text-sm"
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
      </div>

      {/* Підкатегорії */}
      {subcats?.length > 0 && (
        <>
          <h2 className="text-xl font-semibold mb-3">Підкатегорії</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            {subcats.map((c) => (
              <Link
                to={`/category/${c.slug}`}
                key={c.id}
                className="group border rounded-lg overflow-hidden bg-white hover:shadow"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
                  {/* бейдж кількості */}
                  <div className="absolute top-2 right-2 bg-slate-800 text-white text-xs px-2 py-1 rounded-full">
                    {c.product_count}
                  </div>
                  {c.image_url ? (
                    <img
                      src={c.image_url}
                      alt={c.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                      без зображення
                    </div>
                  )}
                </div>
                <div className="p-3 text-center font-medium">{c.name}</div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Товари */}
      <h2 className="text-xl font-semibold mb-3">Товари</h2>
      {products?.length === 0 ? (
        <div className="text-gray-600">У цій категорії поки немає товарів.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Карточка товару (мінімальна, без залежностей від інших компонентів) */
function ProductCard({ p }) {
  const price = useMemo(() => Number(p.price_dropship || 0), [p.price_dropship]);
  return (
    <div className="border rounded-lg bg-white overflow-hidden hover:shadow transition-shadow">
      <div className="relative aspect-[4/3] bg-gray-50">
        {!p.in_stock && (
          <div className="absolute top-2 left-2 bg-gray-700 text-white text-xs px-2 py-1 rounded">
            Немає
          </div>
        )}
        {p.image_url ? (
          <img
            src={p.image_url}
            alt={p.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            без зображення
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="text-sm font-medium line-clamp-2 min-h-[2.5rem]">{p.name}</div>
        <div className="mt-2 flex items-center justify-between">
          <div className="font-bold">{price.toFixed(2)} грн</div>
          <div
            className={
              "text-xs " + (p.in_stock ? "text-green-600" : "text-gray-500")
            }
          >
            {p.in_stock ? "В наявності" : "Немає"}
          </div>
        </div>
      </div>
    </div>
  );
}
