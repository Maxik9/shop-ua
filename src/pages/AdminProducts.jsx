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

  // ===== вибрані товари
  const [selected, setSelected] = useState(new Set()); // Set<string>

  // мапа категорій для швидкого доступу до імені
  const catNameById = useMemo(() => {
    const m = new Map();
    categories.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [categories]);

  async function load() {
    setLoading(true);
    setErr("");

    const { data: cats, error: e1 } = await supabase
      .from("categories")
      .select("id, name")
      .order("name", { ascending: true });
    if (e1) setErr(e1.message);
    setCategories(cats || []);

    const { data: prods, error: e2 } = await supabase
      .from("products")
      .select("id, name, price_dropship, sku, in_stock, category_id, image_url, archived_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(1000);
    if (e2) setErr((s) => s || e2.message);
    setItems(prods || []);

    setSelected(new Set());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // фільтрація/пошук локально
  const filtered = useMemo(() => {
    let res = items;

    const qq = q.trim().toLowerCase();
    if (qq) {
      res = res.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(qq)) ||
          (p.sku && p.sku.toLowerCase().includes(qq))
      );
    }

    if (stockFilter === "in") res = res.filter((p) => p.in_stock && !p.archived_at);
    if (stockFilter === "out") res = res.filter((p) => !p.in_stock && !p.archived_at);

    if (catFilter === "archived") res = res.filter((p) => !!p.archived_at);
    else if (catFilter !== "all") res = res.filter((p) => p.category_id === catFilter);

    if (catFilter !== "archived") res = res.filter((p) => !p.archived_at);

    return res;
  }, [items, q, stockFilter, catFilter]);

  // ====== масові дії ===================================================
  const selectedIds = Array.from(selected);
  const hasSelection = selectedIds.length > 0;

  const toggleOne = (id, checked) => {
    setSelected((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const toggleAllFiltered = (checked) => {
    if (!filtered.length) return;
    setSelected((prev) => {
      if (checked) return new Set(filtered.map((p) => p.id));
      return new Set();
    });
  };

  async function bulkArchive() {
    if (!hasSelection) return;
    if (!confirm(`Архівувати вибрані (${selectedIds.length}) товари?`)) return;
    for (const id of selectedIds) {
      const { error } = await supabase.rpc("archive_product", { p_id: id });
      if (error) return alert("Помилка архівації: " + error.message);
    }
    await load();
  }

  async function bulkSetStock(value) {
    if (!hasSelection) return;
    const { error } = await supabase
      .from("products")
      .update({ in_stock: value, updated_at: new Date().toISOString() })
      .in("id", selectedIds);
    if (error) return alert("Помилка зміни наявності: " + error.message);
    await load();
  }

  async function bulkMoveToCategory(catId) {
    if (!hasSelection || !catId) return;
    const { error } = await supabase
      .from("products")
      .update({ category_id: catId, updated_at: new Date().toISOString() })
      .in("id", selectedIds);
    if (error) return alert("Помилка зміни категорії: " + error.message);
    await load();
  }

  // одиночні дії
  async function archiveOne(p) {
    if (!confirm(`Архівувати товар «${p.name}»?`)) return;
    const { error } = await supabase.rpc("archive_product", { p_id: p.id });
    if (error) return alert("Помилка архівації: " + error.message);
    await load();
  }
  async function unarchiveOne(p) {
    const { error } = await supabase.rpc("unarchive_product", { p_id: p.id });
    if (error) return alert("Помилка відновлення: " + error.message);
    await load();
  }
  async function copyOne(p) {
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

  // ====== НОВЕ: очистити архів від товарів без замовлень =================
  async function purgeArchivedWithoutOrders() {
    if (!confirm("Видалити з архіву всі товари, по яких не було жодного замовлення? Дію не можна скасувати.")) {
      return;
    }
    try {
      const { data, error } = await supabase.rpc("purge_archived_without_orders");
      if (error) throw error;
      alert(`Видалено: ${Number(data || 0)} товар(ів).`);
      await load();
    } catch (e) {
      alert("Помилка очищення: " + (e?.message || e));
    }
  }

  // =====================================================================

  return (
    <div className="container-page mt-header">
      <div className="flex items-center justify-between mb-4">
        <h1 className="h1">Товари (адмін)</h1>
        <Link to="/admin/products/new" className="btn-primary">Додати товар</Link>
      </div>

      {/* Фільтри */}
      <div className="card mb-4">
        <div className="card-body grid gap-3 md:grid-cols-4">
          <input
            className="input"
            placeholder="Пошук (назва або SKU)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <select className="input" value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
            <option value="all">Наявність: усі</option>
            <option value="in">Лише в наявності</option>
            <option value="out">Лише відсутні</option>
          </select>

          <select className="input" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
            <option value="all">Категорія: усі</option>
            <option value="archived">Архів</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <div className="flex gap-2">
            <button className="btn-outline flex-1" onClick={load} disabled={loading}>
              Оновити
            </button>
            {/* НОВА КНОПКА: очищення архіву */}
            <button
              className="btn-outline flex-1"
              onClick={purgeArchivedWithoutOrders}
              title="Видалити назавжди архівні товари без замовлень"
            >
              Видалити архів (без замовлень)
            </button>
          </div>
        </div>
      </div>

      {/* Масові дії (панель над списком) */}
      <div className="card mb-3">
        <div className="card-body flex flex-col md:flex-row md:items-center gap-3">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="checkbox"
              checked={hasSelection && selected.size === filtered.length && filtered.length > 0}
              onChange={(e) => toggleAllFiltered(e.target.checked)}
            />
            <span>Вибрати всі на сторінці</span>
          </label>

          <div className="text-sm text-slate-600">
            Вибрано: <b>{selectedIds.length}</b>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button className="btn-outline" onClick={bulkArchive} disabled={!hasSelection}>
              Архівувати вибрані
            </button>
            <button className="btn-outline" onClick={() => bulkSetStock(true)} disabled={!hasSelection}>
              Позначити "в наявності"
            </button>
            <button className="btn-outline" onClick={() => bulkSetStock(false)} disabled={!hasSelection}>
              Позначити "нема в наявності"
            </button>

            <div className="flex items-center gap-2">
              <select
                className="input min-w-[220px]"
                defaultValue=""
                onChange={async (e) => {
                  const val = e.target.value;
                  if (!val) return;
                  await bulkMoveToCategory(val);
                  e.target.value = "";
                }}
                disabled={!hasSelection}
              >
                <option value="">Перемістити в категорію…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Список товарів */}
      <div className="card">
        <div className="card-body">
          {err && <div className="alert alert-error mb-3"><span>{err}</span></div>}
          {loading ? (
            <div>Завантаження…</div>
          ) : (
            <div className="grid gap-4">
              {filtered.map((p) => {
                const catName = p.category_id ? (catNameById.get(p.category_id) || "—") : "—";
                return (
                  <div key={p.id} className="grid grid-cols-[32px_80px_1fr_auto] gap-4 items-center">
                    {/* чекбокс */}
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={selected.has(p.id)}
                        onChange={(e) => toggleOne(p.id, e.target.checked)}
                      />
                    </div>

                    {/* зображення */}
                    <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden">
                      {p.image_url && (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      )}
                    </div>

                    {/* інформація */}
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-sm text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>SKU: {p.sku || "—"}</span>
                        <span>Ціна: {Number(p.price_dropship || 0).toFixed(2)} ₴</span>
                        {/* БЕЙДЖ КАТЕГОРІЇ */}
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
                          {catName}
                        </span>
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

                    {/* Дії для одного товару */}
                    <div className="justify-self-end">
                      <select
                        className="input w-44"
                        defaultValue=""
                        onChange={async (e) => {
                          const val = e.target.value;
                          e.target.value = "";
                          if (val === "edit") window.location.assign(`/admin/products/${p.id}`);
                          if (val === "copy") await copyOne(p);
                          if (val === "archive") await archiveOne(p);
                          if (val === "unarchive") await unarchiveOne(p);
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
                );
              })}

              {!loading && filtered.length === 0 && (
                <div className="text-muted">Нічого не знайдено.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
