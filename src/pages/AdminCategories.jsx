import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient"; // src/pages -> src/supabaseClient.js

function move(arr, from, to) {
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

function Section({ title, items, onChange, onSave, saving, onDelete }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Зберігаю..." : "Зберегти порядок"}
        </button>
      </div>

      <ul className="space-y-2">
        {items.map((c, i) => (
          <li key={c.id} className="flex items-center justify-between bg-white p-3 rounded shadow-sm">
            <div className="truncate">
              <span className="text-sm text-slate-500 mr-2">#{i + 1}</span>
              <span className="font-medium">{c.name}</span>
            </div>
            <div className="flex gap-2">
              <Link to={`/admin/categories/${c.id}`} className="px-2 py-1 rounded border" title="Редагувати">
                Редагувати
              </Link>
              <button
                className="px-2 py-1 rounded border text-red-700"
                onClick={() => onDelete(c)}
                title="Видалити"
              >
                Видалити
              </button>
              <button
                className="px-2 py-1 rounded border"
                onClick={() => onChange(move(items, i, Math.max(0, i - 1)))}
                disabled={i === 0}
                title="Вгору"
              >
                ↑
              </button>
              <button
                className="px-2 py-1 rounded border"
                onClick={() => onChange(move(items, i, Math.min(items.length - 1, i + 1)))}
                disabled={i === items.length - 1}
                title="Вниз"
              >
                ↓
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminCategories() {
  const [top, setTop] = useState([]);
  const [children, setChildren] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingTop, setSavingTop] = useState(false);
  const [savingChild, setSavingChild] = useState({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: roots, error } = await supabase
        .from("categories")
        .select("id,name,parent_id,sort_order")
        .is("parent_id", null)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }
      setTop(roots || []);

      const ch = {};
      for (const r of roots || []) {
        const { data } = await supabase
          .from("categories")
          .select("id,name,parent_id,sort_order")
          .eq("parent_id", r.id)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true });
        ch[r.id] = data || [];
      }
      setChildren(ch);
      setLoading(false);
    })();
  }, []);

  async function saveTop() {
    try {
      setSavingTop(true);
      const ids = top.map((c) => c.id);
      const { error } = await supabase.rpc("set_category_order", { p_ids: ids });
      if (error) throw error;
    } catch (e) {
      console.error(e);
      alert("Помилка збереження порядку верхнього рівня");
    } finally {
      setSavingTop(false);
    }
  }

  async function saveChild(parentId) {
    try {
      setSavingChild((s) => ({ ...s, [parentId]: true }));
      const ids = (children[parentId] || []).map((c) => c.id);
      const { error } = await supabase.rpc("set_category_order", { p_ids: ids });
      if (error) throw error;
    } catch (e) {
      console.error(e);
      alert("Помилка збереження підкатегорій");
    } finally {
      setSavingChild((s) => ({ ...s, [parentId]: false }));
    }
  }

  async function deleteCategory(c) {
    const warn = "Видалити категорію? Підкатегорії стануть без батьківської, товари втратять прив'язку до категорії.";
    if (!window.confirm(warn)) return;
    try {
      await supabase.from("categories").delete().eq("id", c.id);
      // оновити локальний стан
      setTop((arr) => arr.filter((x) => x.id !== c.id));
      setChildren((ch) => {
        const next = { ...ch };
        for (const pid of Object.keys(next)) {
          next[pid] = (next[pid] || []).filter((x) => x.id !== c.id);
        }
        return next;
      });
    } catch (e) {
      console.error(e);
      alert("Не вдалося видалити");
    }
  }

  if (loading) {
    return <div className="p-4">Завантаження...</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Категорії</h2>
        <Link to="/admin/categories/new" className="px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700">
          + Нова категорія
        </Link>
      </div>

      <Section
        title="Верхній рівень"
        items={top}
        onChange={setTop}
        onSave={saveTop}
        saving={savingTop}
        onDelete={deleteCategory}
      />

      {top.map((r) => (
        <Section
          key={r.id}
          title={`Підкатегорії: ${r.name}`}
          items={children[r.id] || []}
          onChange={(arr) => setChildren((prev) => ({ ...prev, [r.id]: arr }))}
          onSave={() => saveChild(r.id)}
          saving={!!savingChild[r.id]}
          onDelete={deleteCategory}
        />
      ))}
    </div>
  );
}
