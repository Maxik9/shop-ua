import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient"; // src/pages -> src/supabaseClient.js

// helpers
function move(arr, from, to) {
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}
const slugify = (s) =>
  (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");

function Row({ c, idx, items, onChange, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: c.name || "", slug: c.slug || "", image_url: c.image_url || "", parent_id: c.parent_id });

  useEffect(() => {
    setForm({ name: c.name || "", slug: c.slug || "", image_url: c.image_url || "", parent_id: c.parent_id });
  }, [c.id]);

  async function saveEdit() {
    try {
      const payload = {
        name: form.name || c.name,
        slug: form.slug || null,
        image_url: form.image_url || null,
        parent_id: form.parent_id || null,
      };
      const { error } = await supabase.from("categories").update(payload).eq("id", c.id);
      if (error) throw error;
      onEdit({ ...c, ...payload });
      setEditing(false);
    } catch (e) {
      console.error(e);
      alert("Помилка збереження категорії");
    }
  }

  return (
    <li className="flex items-center justify-between bg-white p-3 rounded shadow-sm">
      <div className="flex-1 min-w-0">
        {!editing ? (
          <div className="truncate">
            <span className="text-sm text-slate-500 mr-2">#{idx + 1}</span>
            <span className="font-medium">{c.name}</span>
            {c.slug ? <span className="text-xs text-slate-400 ml-2">({c.slug})</span> : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              className="border rounded px-2 py-1"
              placeholder="Назва"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onBlur={() => {
                if (!form.slug) setForm((f) => ({ ...f, slug: slugify(f.name) }));
              }}
            />
            <input
              className="border rounded px-2 py-1"
              placeholder="Slug (необов'язково)"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            />
            <input
              className="border rounded px-2 py-1"
              placeholder="Image URL (необов'язково)"
              value={form.image_url}
              onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
            />
            {/* parent select віддаємо наверх через onEditParent пропущено для простоти */}
          </div>
        )}
      </div>

      <div className="flex gap-2 ml-3">
        {!editing ? (
          <>
            <button
              className="px-2 py-1 rounded border"
              onClick={() => onChange(move(items, idx, Math.max(0, idx - 1)))}
              disabled={idx === 0}
              title="Вгору"
            >
              ↑
            </button>
            <button
              className="px-2 py-1 rounded border"
              onClick={() => onChange(move(items, idx, Math.min(items.length - 1, idx + 1)))}
              disabled={idx === items.length - 1}
              title="Вниз"
            >
              ↓
            </button>
            <button className="px-2 py-1 rounded border" onClick={() => setEditing(true)} title="Редагувати">
              ✎
            </button>
          </>
        ) : (
          <>
            <button className="px-2 py-1 rounded border bg-green-600 text-white" onClick={saveEdit} title="Зберегти">
              Зберегти
            </button>
            <button className="px-2 py-1 rounded border" onClick={() => setEditing(false)} title="Скасувати">
              Скасувати
            </button>
          </>
        )}
      </div>
    </li>
  );
}

function Section({ title, items, onChange, onSave, saving, onEdit }) {
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
          <Row key={c.id} c={c} idx={i} items={items} onChange={onChange} onEdit={onEdit} />
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
  const [newCat, setNewCat] = useState({ name: "", parent_id: "", slug: "", image_url: "" });

  const topOptions = useMemo(() => [{ id: "", name: "— Без батьківської —" }, ...top], [top]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: roots, error } = await supabase
        .from("categories")
        .select("id,name,parent_id,sort_order,slug,image_url")
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
          .select("id,name,parent_id,sort_order,slug,image_url")
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

  async function createCategory(e) {
    e.preventDefault();
    try {
      const payload = {
        name: newCat.name.trim(),
        parent_id: newCat.parent_id || null,
        slug: newCat.slug ? slugify(newCat.slug) : slugify(newCat.name),
        image_url: newCat.image_url || null,
        sort_order: 0,
      };
      if (!payload.name) {
        alert("Вкажи назву");
        return;
      }
      const { data, error } = await supabase.from("categories").insert(payload).select("id,name,parent_id,sort_order,slug,image_url").single();
      if (error) throw error;
      // refresh in-memory lists
      if (!payload.parent_id) {
        setTop((t) => [...t, data]);
      } else {
        setChildren((ch) => ({ ...ch, [payload.parent_id]: [ ...(ch[payload.parent_id] || []), data ] }));
      }
      setNewCat({ name: "", parent_id: "", slug: "", image_url: "" });
    } catch (e) {
      console.error(e);
      alert("Помилка створення категорії");
    }
  }

  function onEditTop(updated) {
    setTop((arr) => arr.map((x) => (x.id === updated.id ? updated : x)));
  }
  function onEditChild(parentId, updated) {
    setChildren((ch) => ({
      ...ch,
      [parentId]: (ch[parentId] || []).map((x) => (x.id === updated.id ? updated : x)),
    }));
  }

  if (loading) return <div className="p-4">Завантаження...</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Категорії: порядок, створення та редагування</h2>

      {/* CREATE */}
      <form onSubmit={createCategory} className="bg-white rounded shadow p-4 mb-8 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          className="border rounded px-2 py-1"
          placeholder="Назва *"
          value={newCat.name}
          onChange={(e) => setNewCat((f) => ({ ...f, name: e.target.value }))}
          onBlur={() => {
            if (!newCat.slug) setNewCat((f) => ({ ...f, slug: slugify(f.name) }));
          }}
        />
        <select
          className="border rounded px-2 py-1"
          value={newCat.parent_id}
          onChange={(e) => setNewCat((f) => ({ ...f, parent_id: e.target.value }))}
        >
          {topOptions.map((o) => (
            <option key={o.id} value={o.id || ""}>
              {o.name}
            </option>
          ))}
        </select>
        <input
          className="border rounded px-2 py-1"
          placeholder="Slug (необов'язково)"
          value={newCat.slug}
          onChange={(e) => setNewCat((f) => ({ ...f, slug: e.target.value }))}
        />
        <input
          className="border rounded px-2 py-1"
          placeholder="Image URL (необов'язково)"
          value={newCat.image_url}
          onChange={(e) => setNewCat((f) => ({ ...f, image_url: e.target.value }))}
        />
        <div className="md:col-span-4 text-right">
          <button className="px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700">Додати категорію</button>
        </div>
      </form>

      {/* TOP LEVEL */}
      <Section
        title="Верхній рівень"
        items={top}
        onChange={setTop}
        onSave={saveTop}
        saving={savingTop}
        onEdit={onEditTop}
      />

      {/* CHILDREN */}
      {top.map((r) => (
        <Section
          key={r.id}
          title={`Підкатегорії: ${r.name}`}
          items={children[r.id] || []}
          onChange={(arr) => setChildren((prev) => ({ ...prev, [r.id]: arr }))}
          onSave={() => saveChild(r.id)}
          saving={!!savingChild[r.id]}
          onEdit={(upd) => onEditChild(r.id, upd)}
        />
      ))}
    </div>
  );
}
