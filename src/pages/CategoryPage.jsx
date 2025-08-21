import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function CategoryPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [category, setCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const sort = searchParams.get("sort") || "alpha";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // отримаємо категорію
      const { data: cat } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug)
        .single();

      setCategory(cat);

      // товари
      let query = supabase.from("items").select("*").eq("category_id", cat?.id);

      if (sort === "price_asc") query = query.order("price", { ascending: true });
      else if (sort === "price_desc") query = query.order("price", { ascending: false });
      else query = query.order("title", { ascending: true });

      const { data: items } = await query;
      setItems(items || []);
      setLoading(false);
    };

    fetchData();
  }, [slug, sort]);

  // Кнопка "Назад": якщо є історія — крок назад; інакше на головну
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  const handleSortChange = (e) => {
    const next = e.target.value;
    const params = new URLSearchParams(searchParams);
    params.set("sort", next);
    setSearchParams(params, { replace: false });
  };

  if (loading) return <div className="container-page mt-header">Завантаження…</div>;

  if (!category) return <div className="container-page mt-header">Категорію не знайдено</div>;

  return (
    <div className="container-page mt-header">
      <div className="flex items-center justify-between mb-4">
        <button onClick={goBack} className="btn-outline">
          ← Назад
        </button>
        <h1 className="text-xl font-bold">{category.title}</h1>
        <div></div>
      </div>

      <div className="mb-4">
        <select className="select" value={sort} onChange={handleSortChange}>
          <option value="alpha">За назвою (А–Я)</option>
          <option value="price_asc">За ціною (зрост.)</option>
          <option value="price_desc">За ціною (спад.)</option>
        </select>
      </div>

      {items.length === 0 ? (
        <p>Немає товарів у цій категорії.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} className="card">
              <div className="card-body">
                <h2 className="card-title">{item.title}</h2>
                <p>{item.price} грн</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
