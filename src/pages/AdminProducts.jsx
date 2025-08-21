// src/pages/AdminProducts.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function AdminProducts() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState("");
  const [stockFilter, setStockFilter] = useState("all"); // all | in | out
  const [catFilter, setCatFilter] = useState("all");     // all | <category_id> | archived
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");

    // Категорії (для фільтра)
    const { data: cats, error: e1 } = await supabase
      .from("categories")
      .select("id, name")
      .order("name", { ascending: true });
    if (e1) setErr(e1.message);
    setCategories(cats || []);

    // Товари (адмін бачить усі, включно з архівом — так налаштовано RLS)
    const { data: prods, error: e2 } = await supabase
      .from("products")
      .select("id, name, price_dropship, sku, in_stock, category_id, image_url, archived_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(1000);
    if (e2) setErr((s) => s || e2.message);
    setItems(prods || []);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // Фільтрація/пошук локально
  const filtered = useMemo(() => {
    let res = items;

    // Пошук по назві/sku
    const qq = q.trim().toLowerCase();
    if (qq) {
      res = res.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(qq)) ||
          (p.sku && p.sku.toLowerCase().includes(qq))
      );
    }

    // Фільтр по наявності
    if (stockFilter === "in") res = res.filter((p) => p.in_stock && !p.archived_at);
    if (stockFilter === "out") res = res.filter((p) => !p.in_stock && !p.archived_at);

    // Фільтр по категорії / архіву
    if (catFilter === "archived") res = res.filter((p) => !!p.archived_at);
    else if (catFilter !== "all") res = res.filter((p) => p.category_id === catFilter);

    // Якщо обрано категорію — з архівом не змішуємо
    if (catFilter !== "archived") res = res.filter((p) => !p.archived_at);

    return res;
  }, [items, q, stockFilter, catFilter]);

  // ====== ДІЇ =======================================================
  async function archive(p) {
    if (!confirm(`Архівувати товар «${p.name}»?`)) return;
    const { error } = await supabase.rpc("archive_product", { p_id: p.id });
    if (error) return alert("Помилка архівації: " + error.message);
    await load();
  }

  async function unarchive(p) {
    const { error } = await supabase.rpc("unarchive_product", { p_id: p.id });
    if (error) return alert("Помилка відновлення: " + error.message);
    await load();
  }

  async function copy(p) {
    // простий клон: name + " (копія)", sku прибрати, в наявності = false
    const { error } = await supabase.from("products").insert({
      name: `${p.name} (копія)`,
      description: p.description || null,
      image_url: p.image_url || null,
      gallery_json: p.gallery_json || [],
      price_dropship: p.price_dropship,
      sku: null,
      in_stock: false,
      category_id: p.category_id,
    });
    if (error) return alert("Не вдалося створити копію: " + error.message);
    await load();
  }

  // ==================================================================

  return (
    <div className="container-page mt-header">
      <div className="flex items-center justify-between mb-4">
        <h1 className="h1">Товари (адмін)</h1>
        <Link to="/admin/products/new" className="btn-primary">Додати товар</Link>
      </div>

      {/* Панель фільтрів */}
      <div className="card mb-4">
        <div className="card-body grid gap-3 md:grid-cols-4">
          <input
            className="input"
            placeholder="Пошук (назва або SKU)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <select
            className="input"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
          >
            <option value="all">Наявність: усі</option>
            <option value="in">Лише в наявності</option>
            <option value="out">Лише відсутні</option>
          </select>

          <select
            className="input"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
          >
            <option value="all">Категорія: усі</option>
            <option value="archived">Архів</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <button className="btn-outline" onClick={load} disabled={loading}>
            Оновити
          </button>
        </div>
      </div>

      {/* Помилки */}
      {err && (
        <div className="alert alert-error mb-3">
          <span>{err}</span>
        </div>
      )}

      {/* Таблиця/грид товарів */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div>Завантаження…</div>
          ) : (
            <div className="grid gap-4">
              {filtered.map((p) => (
                <div key={p.id} className="grid grid-cols-[80px_1fr_auto] gap-4 items-center">
                  <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden">
                    {p.image_url && (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    )}
                  </div>

                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-slate-600">
                      SKU: {p.sku || "—"} · Ціна: {Number(p.price_dropship || 0).toFixed(2)} ₴
                    </div>
                    <div className="text-xs mt-1">
                      {p.archived_at ? (
                        <span className="text-amber-600">АРХІВ • {new Date(p.archived_at).toLocaleString()}</span>
                      ) : p.in_stock ? (
                        <span className="text-emerald-600">В наявності</span>
                      ) : (
                        <span className="text-rose-600">Немає в наявності</span>
                      )}
                    </div>
                  </div>

                  {/* Дії */}
                  <div className="justify-self-end">
                    <select
                      className="input w-40"
                      defaultValue=""
                      onChange={async (e) => {
                        const val = e.target.value;
                        e.target.value = "";
                        if (val === "edit") window.location.assign(`/admin/products/${p.id}`);
                        if (val === "copy") await copy(p);
                        if (val === "archive") await archive(p);
                        if (val === "unarchive") await unarchive(p);
                      }}
                    >
                      <option value="" disabled>Дії</option>
                      <option value="edit">Редагувати</option>
                      <option value="copy">Копіювати</option>
                      {p.archived_at ? (
                        <option value="unarchive">Відновити</option>
                      ) : (
                        <option value="archive">Архівувати</option>
                      )}
                    </select>
                  </div>
                </div>
              ))}

              {(!loading && filtered.length === 0) && (
                <div className="text-muted">Нічого не знайдено.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
