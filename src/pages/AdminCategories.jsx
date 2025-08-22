// src/pages/AdminCategories.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

/**
 * Сторінка адмін-категорій (верхній рівень + підкатегорії).
 * - Переміщення вгору/вниз всередині одного батька (по sort_order)
 * - Безпечне видалення (через RPC delete_category_safe):
 *      товари -> без категорії, підкатегорії -> верхній рівень
 * - Мінімальні зміни у зовнішньому вигляді (кнопки/класи збережені)
 */

export default function AdminCategories() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  /** всі категорії */
  const [list, setList] = useState([]); // [{id,name,parent_id,sort_order}]

  /** розбивка на верхній рівень і children */
  const top = useMemo(() => list.filter((c) => !c.parent_id), [list]);
  const children = useMemo(() => {
    const m = {};
    for (const c of list) {
      if (!c.parent_id) continue;
      if (!m[c.parent_id]) m[c.parent_id] = [];
      m[c.parent_id].push(c);
    }
    // локальне сортування у кожній гілці
    for (const pid of Object.keys(m)) {
      m[pid].sort(
        (a, b) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
          (a.name || "").localeCompare(b.name || "")
      );
    }
    return m;
  }, [list]);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, parent_id, sort_order")
        .order("parent_id", { ascending: true })
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.message || "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ================= helpers =================

  function siblingsOf(catId) {
    const me = list.find((x) => x.id === catId);
    if (!me) return [];
    return list
      .filter((x) => (x.parent_id || null) === (me.parent_id || null))
      .sort(
        (a, b) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
          (a.name || "").localeCompare(b.name || "")
      );
  }

  async function swapSort(a, b) {
    // обмін sort_order двох категорій
    const aOrder = a.sort_order ?? 0;
    const bOrder = b.sort_order ?? 0;

    const { error: e1 } = await supabase
      .from("categories")
      .update({ sort_order: bOrder })
      .eq("id", a.id);
    if (e1) return alert("Не вдалося змінити порядок: " + e1.message);

    const { error: e2 } = await supabase
      .from("categories")
      .update({ sort_order: aOrder })
      .eq("id", b.id);
    if (e2) return alert("Не вдалося змінити порядок: " + e2.message);

    // локально міняємо теж — без повного reload
    setList((prev) =>
      prev.map((x) =>
        x.id === a.id ? { ...x, sort_order: bOrder } : x.id === b.id ? { ...x, sort_order: aOrder } : x
      )
    );
  }

  async function moveUp(cat) {
    const s = siblingsOf(cat.id);
    const idx = s.findIndex((x) => x.id === cat.id);
    if (idx <= 0) return;
    await swapSort(cat, s[idx - 1]);
  }

  async function moveDown(cat) {
    const s = siblingsOf(cat.id);
    const idx = s.findIndex((x) => x.id === cat.id);
    if (idx === -1 || idx >= s.length - 1) return;
    await swapSort(cat, s[idx + 1]);
  }

  /** БЕЗПЕЧНЕ ВИДАЛЕННЯ через RPC */
  async function deleteCategory(cat) {
    const warn =
      "Видалити категорію?\n" +
      "• Її товари стануть «без категорії».\n" +
      "• Її підкатегорії перейдуть у верхній рівень.";
    if (!window.confirm(warn)) return;

    const { error } = await supabase.rpc("delete_category_safe", { p_id: cat.id });
    if (error) {
      console.error(error);
      alert("Не вдалося видалити категорію: " + (error.message || error));
      return;
    }

    // локально: прибираємо саму категорію,
    // її дітей (якщо були) підтягуємо у верхній рівень.
    setList((prev) => {
      const removed = prev.filter((x) => x.id !== cat.id);
      // діти цієї категорії -> parent_id = null
      // (на БД уже оновлено RPC; тут лише синхронізуємо стан)
      const res = removed.map((x) =>
        (x.parent_id || null) === cat.id ? { ...x, parent_id: null } : x
      );
      // фінальне сортування для стабільності
      return res.sort(
        (a, b) =>
          (a.parent_id || "").localeCompare(b.parent_id || "") ||
          (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
          (a.name || "").localeCompare(b.name || "")
      );
    });
  }

  // ================== UI =====================

  function Row({ c, idx }) {
    return (
      <div className="flex items-center gap-3 justify-between rounded-xl border border-slate-200 px-3 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-slate-500 w-10 shrink-0">#{idx + 1}</div>
          <div className="font-medium truncate">{c.name}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="btn-outline"
            onClick={() => nav(`/admin/categories/${c.id}`)}
          >
            Редагувати
          </button>

          <button
            className="btn-danger"
            onClick={() => deleteCategory(c)}
          >
            Видалити
          </button>

          <button
            className="btn-outline w-10 h-10"
            title="Вгору"
            onClick={() => moveUp(c)}
          >
            ↑
          </button>

          <button
            className="btn-outline w-10 h-10"
            title="Вниз"
            onClick={() => moveDown(c)}
          >
            ↓
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 py-4 sm:py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="h1">Категорії</h1>
        <button
          className="btn-primary"
          onClick={() => nav("/admin/categories/new")}
        >
          Додати категорію
        </button>
      </div>

      {err && (
        <div className="alert alert-error mb-3">
          <span>{err}</span>
        </div>
      )}

      <div className="card">
        <div className="card-body space-y-3">
          {loading && <div>Завантаження…</div>}

          {!loading && top.length === 0 && (
            <div className="text-muted">Немає категорій.</div>
          )}

          {!loading &&
            top
              .slice()
              .sort(
                (a, b) =>
                  (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
                  (a.name || "").localeCompare(b.name || "")
              )
              .map((c, i) => (
                <div key={c.id} className="space-y-2">
                  <Row c={c} idx={i} />

                  {/* підкатегорії */}
                  {(children[c.id] || []).map((sub, k) => (
                    <div key={sub.id} className="pl-8">
                      <Row c={sub} idx={k} />
                    </div>
                  ))}
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
