import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

/* @typedef {{id:string,name:string,parent_id:string|null,sort_order:number|null}} Category */
const Category = undefined as any; // for JSDoc
  id;
  name;
  parent_id | null;
  sort_order: number | null;
};

function move<T>(arr, from: number, to: number) {
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

function Section({
  title,
  items,
  onChange,
  onSave,
  saving,
}: {
  title;
  items;
  onChange: (items) => void;
  onSave: () => Promise<void>;
  saving;
}) {
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
  const [top, setTop] = useState<Category[]>([]);
  const [children, setChildren] = useState<Record<string, Category[]>>({});
  const [loading, setLoading] = useState(true);
  const [savingTop, setSavingTop] = useState(false);
  const [savingChild, setSavingChild] = useState<Record<string, boolean>>({});

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
      setTop(roots ?? []);

      // preload children for each root
      const ch = {};
      for (const r of roots ?? []) {
        const { data } = await supabase
          .from("categories")
          .select("id,name,parent_id,sort_order")
          .eq("parent_id", r.id)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true });
        ch[r.id] = data ?? [];
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

  if (loading) {
    return <div className="p-4">Завантаження...</div>;
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Порядок відображення категорій</h2>

      <Section
        title="Верхній рівень"
        items={top}
        onChange={setTop}
        onSave={saveTop}
        saving={savingTop}
      />

      {top.map((r) => (
        <Section
          key={r.id}
          title={`Підкатегорії: ${r.name}`}
          items={children[r.id] || []}
          onChange={(arr) => setChildren((prev) => ({ ...prev, [r.id]: arr }))}
          onSave={() => saveChild(r.id)}
          saving={!!savingChild[r.id]}
        />
      ))}
    </div>
  );
}
