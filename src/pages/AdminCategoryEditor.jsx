import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "../supabaseClient"; // src/pages -> src/supabaseClient.js

const slugify = (s) =>
  (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function AdminCategoryEditor() {
  const { id } = useParams(); // ":id" or undefined
  const navigate = useNavigate();
  const isNew = !id || id === "new";

  const [allCats, setAllCats] = useState([]);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    parent_id: "",
    image_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // load all categories for parent select
      const { data: cats, error: e1 } = await supabase
        .from("categories")
        .select("id, name, parent_id")
        .order("name", { ascending: true });
      if (e1) {
        console.error(e1);
        setLoading(false);
        return;
      }
      setAllCats(cats || []);

      if (!isNew) {
        const { data, error } = await supabase
          .from("categories")
          .select("id, name, slug, parent_id, image_url")
          .eq("id", id)
          .single();
        if (error) {
          console.error(error);
          setLoading(false);
          return;
        }
        setForm({
          name: data.name || "",
          slug: data.slug || "",
          parent_id: data.parent_id || "",
          image_url: data.image_url || "",
        });
      }
      setLoading(false);
    })();
  }, [id]);

  const parentOptions = useMemo(() => {
    // cannot pick itself as parent
    const opts = [{ id: "", name: "— Без батьківської —" }];
    for (const c of allCats) {
      if (!isNew && c.id === id) continue;
      opts.push({ id: c.id, name: c.name });
    }
    return opts;
  }, [allCats, id, isNew]);

  async function handleSave(e) {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        slug: form.slug ? slugify(form.slug) : slugify(form.name),
        parent_id: form.parent_id || null,
        image_url: form.image_url || null,
      };
      if (!payload.name) {
        alert("Вкажи назву");
        return;
      }
      if (isNew) {
        // default sort_order to end of list for selected parent
        let sort_order = 0;
        {
          const { count } = await supabase
            .from("categories")
            .select("*", { count: "exact", head: true })
            .is("parent_id", payload.parent_id);
          sort_order = (count || 0) + 1;
        }
        const { data, error } = await supabase
          .from("categories")
          .insert({ ...payload, sort_order })
          .select("id")
          .single();
        if (error) throw error;
        navigate(`/admin/categories/${data.id}`);
      } else {
        const { error } = await supabase.from("categories").update(payload).eq("id", id);
        if (error) throw error;
      }
    } catch (e) {
      console.error(e);
      alert(e?.message || "Помилка збереження");
    } finally {
      setSaving(false);
    }
  }

  function extractStoragePath(url) {
    // Supabase public URL format: .../storage/v1/object/public/<bucket>/<path>
    const marker = "/storage/v1/object/public/";
    const idx = (url || "").indexOf(marker);
    if (idx === -1) return null;
    const after = url.substring(idx + marker.length);
    const firstSlash = after.indexOf("/");
    if (firstSlash === -1) return null;
    const bucket = after.substring(0, firstSlash);
    const path = after.substring(firstSlash + 1);
    return { bucket, path };
  }

  async function uploadImage(file) {
    if (!file) return;
    try {
      setUploading(true);
      // Ensure we have an id: if new -> save first to get id
      let catId = id;
      if (isNew) {
        // quick create minimal to get id
        const baseName = (form.name || "Категорія").trim() || "Категорія";
        const payload = {
          name: baseName,
          slug: form.slug ? slugify(form.slug) : slugify(baseName),
          parent_id: form.parent_id || null,
          image_url: null,
          sort_order: 0,
        };
        const { data, error } = await supabase.from("categories").insert(payload).select("id").single();
        if (error) throw error;
        catId = data.id;
        navigate(`/admin/categories/${catId}`);
      }
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `cat-${catId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("category-images").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("category-images").getPublicUrl(path);
      const url = pub?.publicUrl || "";
      setForm((f) => ({ ...f, image_url: url }));
      // save new image_url to DB if editing existing
      if (catId && !isNew) {
        await supabase.from("categories").update({ image_url: url }).eq("id", catId);
      }
    } catch (e) {
      console.error(e);
      alert(e?.message || "Помилка завантаження зображення");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (isNew) return;
    const ok = window.confirm("Видалити категорію? Підкатегорії стануть без батьківської, товари втратять прив'язку до категорії.");
    if (!ok) return;
    try {
      setDeleting(true);
      // best-effort: видалити файл зі сторіджа, якщо є
      if (form.image_url) {
        const parsed = extractStoragePath(form.image_url);
        if (parsed && parsed.bucket === "category-images") {
          await supabase.storage.from("category-images").remove([parsed.path]);
        }
      }
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
      navigate("/admin/categories");
    } catch (e) {
      console.error(e);
      alert(e?.message || "Не вдалося видалити категорію");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <div className="p-4">Завантаження...</div>;

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{isNew ? "Створити категорію" : "Редагувати категорію"}</h2>
        <Link className="text-indigo-600 hover:underline" to="/admin/categories">← До списку</Link>
      </div>

      <form onSubmit={handleSave} className="space-y-4 bg-white rounded shadow p-4">
        <div>
          <label className="block text-sm font-medium mb-1">Назва</label>
          <input
            className="border rounded w-full px-3 py-2"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            onBlur={() => {
              if (!form.slug) setForm((f) => ({ ...f, slug: slugify(f.name) }));
            }}
            placeholder="Наприклад: Смартфони"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Slug (необов'язково)</label>
          <input
            className="border rounded w-full px-3 py-2"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            placeholder="smartfony"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Батьківська категорія</label>
          <select
            className="border rounded w-full px-3 py-2"
            value={form.parent_id || ""}
            onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}
          >
            {parentOptions.map((o) => (
              <option key={o.id || "root"} value={o.id || ""}>{o.name}</option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">Оберіть «Без батьківської», щоб зробити категорію верхнього рівня.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Зображення категорії</label>
          {form.image_url ? (
            <div className="mb-2">
              <img src={form.image_url} alt="category" className="max-h-48 rounded border" />
            </div>
          ) : (
            <div className="mb-2 text-sm text-slate-500">Зображення ще не встановлено</div>
          )}
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => uploadImage(e.target.files?.[0])}
              disabled={uploading}
            />
            {form.image_url ? (
              <button
                type="button"
                className="px-3 py-1.5 rounded border"
                onClick={async () => {
                  setForm((f) => ({ ...f, image_url: "" }));
                  if (!isNew) await supabase.from("categories").update({ image_url: null }).eq("id", id);
                }}
              >
                Видалити зображення
              </button>
            ) : null}
          </div>
          <p className="text-xs text-slate-500 mt-1">Завантаження у публічний бакет <code>category-images</code>.</p>
        </div>

        <div className="flex items-center justify-between">
          {!isNew ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? "Видаляю..." : "Видалити категорію"}
            </button>
          ) : <span />}
          <button
            className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            disabled={saving}
          >
            {saving ? "Збереження..." : (isNew ? "Створити" : "Зберегти")}
          </button>
        </div>
      </form>
    </div>
  );
}
