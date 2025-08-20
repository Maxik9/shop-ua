// supabase/functions/import_yml/index.ts
// Edge Function: YML/XML product import (Supabase + Deno)
// - JWT: увімкнено (verify_jwt=true у config.toml) + ДОДАТКОВА перевірка X-Import-Secret
// - Оновлюємо ТІЛЬКИ in_stock для існуючих товарів (за sku)
// - Створюємо нові товари з усіма полями
// - Товари, яких НЕМає у фіді — НЕ чіпаємо (не змінюємо in_stock)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type FeedCategory = { id: string; parentId: string | null; name: string };
type FeedOffer = {
  sku: string;
  name: string;
  description: string;
  price: number | null;
  pictures: string[];
  in_stock: boolean;
  categoryId: string | null;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const IMPORT_SECRET = Deno.env.get("IMPORT_SECRET") || "";
const DEFAULT_FEED_URL = Deno.env.get("IMPORT_FEED_URL") || "";

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ---------- helpers ----------
function slugify(s: string): string {
  return (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function textOf(el: Element | null): string {
  return (el?.textContent ?? "").trim();
}
function parseBool(val: string | null | undefined): boolean | null {
  if (val == null) return null;
  const v = val.toLowerCase();
  if (["true","1","yes","y","да","так","in stock","available"].includes(v)) return true;
  if (["false","0","no","n","нет","ні","out of stock","unavailable"].includes(v)) return false;
  return null;
}
function detectInStock(offerEl: Element): boolean {
  const a = offerEl.getAttribute("available");
  const byAttr = parseBool(a);
  if (byAttr !== null) return byAttr;

  const byTag = parseBool(textOf(offerEl.querySelector("available")));
  if (byTag !== null) return byTag;

  const q1 = Number(textOf(offerEl.querySelector("stock_quantity")));
  if (!Number.isNaN(q1)) return q1 > 0;
  const q2 = Number(textOf(offerEl.querySelector("quantity")));
  if (!Number.isNaN(q2)) return q2 > 0;

  const st = textOf(offerEl.querySelector("stock_status")).toLowerCase();
  if (st) {
    if (st.includes("в налич") || st.includes("в наяв") || st.includes("есть")) return true;
    if (st.includes("нет в налич") || st.includes("нема") || st.includes("відсут")) return false;
  }
  return true; // за замовчуванням вважаємо, що є
}

async function fetchXml(url: string): Promise<Document> {
  const resp = await fetch(url, { redirect: "follow" });
  if (!resp.ok) throw new Error(`Failed to fetch feed: ${resp.status} ${resp.statusText}`);
  const text = await resp.text();
  const doc = new DOMParser().parseFromString(text, "text/xml");
  if (!doc) throw new Error("Cannot parse XML");
  return doc;
}

function parseCategories(doc: Document): FeedCategory[] {
  const result: FeedCategory[] = [];
  doc.querySelectorAll("categories > category").forEach((c) => {
    const id = c.getAttribute("id") || textOf(c.querySelector("id"));
    if (!id) return;
    const parentId = c.getAttribute("parentId") || c.getAttribute("parent_id") || null;
    const name = textOf(c) || textOf(c.querySelector("name"));
    if (!name) return;
    result.push({ id, parentId, name });
  });
  return result;
}

function parseOffers(doc: Document): FeedOffer[] {
  const res: FeedOffer[] = [];
  doc.querySelectorAll("offers > offer").forEach((o) => {
    const vendorCode = textOf(o.querySelector("vendorCode")) || textOf(o.querySelector("sku"));
    const idAttr = o.getAttribute("id") || "";
    const sku = (vendorCode || idAttr || "").trim();
    if (!sku) return;

    const name = textOf(o.querySelector("name")) || textOf(o.querySelector("model")) || sku;
    const description =
      textOf(o.querySelector("description")) ||
      textOf(o.querySelector("body")) ||
      "";

    const priceStr = textOf(o.querySelector("price"));
    const price = priceStr ? Number(priceStr.replace(",", ".").replace(/[^\d.]/g, "")) : null;

    const pictures: string[] = [];
    o.querySelectorAll("picture, images > image").forEach((p) => {
      const u = textOf(p);
      if (u) pictures.push(u);
    });

    const catId = textOf(o.querySelector("categoryId")) || o.getAttribute("categoryId") || null;

    res.push({
      sku,
      name,
      description,
      price: price !== null && !Number.isNaN(price) ? price : null,
      pictures,
      in_stock: detectInStock(o),
      categoryId: catId,
    });
  });
  return res;
}

async function ensureCategoriesFromFeed(feedCats: FeedCategory[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (feedCats.length === 0) return map;

  const { data: existing, error: e1 } = await supabaseAdmin
    .from("categories")
    .select("id, name, slug");
  if (e1) throw e1;

  const bySlug = new Map<string, string>();
  (existing || []).forEach((c) => bySlug.set(slugify(c.slug || c.name), c.id));

  const byId = new Map<string, FeedCategory>();
  feedCats.forEach((c) => byId.set(c.id, c));

  const roots = feedCats.filter((c) => !c.parentId);
  const children = feedCats.filter((c) => !!c.parentId);

  async function ensureOne(c: FeedCategory): Promise<string> {
    const s = slugify(c.name);
    const found = bySlug.get(s);
    if (found) {
      map.set(c.id, found);
      return found;
    }
    const parentDbId = c.parentId ? map.get(c.parentId) ?? null : null;
    const { data, error } = await supabaseAdmin
      .from("categories")
      .insert({ name: c.name, slug: s, parent_id: parentDbId, sort_order: 0 })
      .select("id")
      .single();
    if (error) throw error;
    bySlug.set(s, data.id);
    map.set(c.id, data.id);
    return data.id;
  }

  for (const r of roots) await ensureOne(r);

  const pending = new Set(children.map((c) => c.id));
  let safety = 0;
  while (pending.size && safety < 10000) {
    safety++;
    let progressed = false;
    for (const id of Array.from(pending)) {
      const c = byId.get(id)!;
      if (!c.parentId || map.has(c.parentId)) {
        await ensureOne(c);
        pending.delete(id);
        progressed = true;
      }
    }
    if (!progressed) break;
  }

  return map;
}

function chunk<T>(arr: T[], size = 500): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ---------- handler ----------
serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "Method Not Allowed" }), {
        status: 405, headers: { "content-type": "application/json" },
      });
    }

    // додаткова перевірка нашого секрету
    const hdrSecret = req.headers.get("x-import-secret") || "";
    if (!IMPORT_SECRET || hdrSecret !== IMPORT_SECRET) {
      return new Response(JSON.stringify({ ok: false, error: "forbidden" }), {
        status: 403, headers: { "content-type": "application/json" },
      });
    }

    // де взяти URL
    let url = DEFAULT_FEED_URL;
    try {
      const body = await req.json();
      if (body?.url) url = String(body.url);
    } catch { /* порожній body — ок */ }
    if (!url) {
      return new Response(JSON.stringify({ ok: false, error: "Missing url parameter" }), {
        status: 400, headers: { "content-type": "application/json" },
      });
    }

    // 1) фетч і парс фіда
    const doc = await fetchXml(url);
    const cats = parseCategories(doc);
    const offers = parseOffers(doc);

    // 2) гарантуємо наявність категорій (створимо відсутні)
    const feedCatToDb = await ensureCategoriesFromFeed(cats);

    // 3) готуємо SKU з фіда
    const feedSkus = offers.map((o) => o.sku);

    // 4) витягуємо існуючі продукти за цими SKU
    const { data: exist, error: epErr } = await supabaseAdmin
      .from("products")
      .select("id, sku, in_stock")
      .in("sku", feedSkus);
    if (epErr) throw epErr;

    const existingBySku = new Map<string, { id: string; in_stock: boolean }>();
    (exist || []).forEach((p) => existingBySku.set(p.sku, { id: p.id, in_stock: p.in_stock }));

    // 5) формуємо оновлення та створення
    const toUpdate: { id: string; in_stock: boolean }[] = [];
    const toInsert: any[] = [];

    for (const off of offers) {
      const found = existingBySku.get(off.sku);
      if (found) {
        if (found.in_stock !== off.in_stock) {
          toUpdate.push({ id: found.id, in_stock: off.in_stock });
        }
      } else {
        const image_url = off.pictures[0] || null;
        const gallery_json = off.pictures.length ? off.pictures : [];
        const category_id = off.categoryId ? feedCatToDb.get(off.categoryId) ?? null : null;

        toInsert.push({
          name: off.name,
          description: off.description || null,
          image_url,
          gallery_json,
          price_dropship: off.price ?? 0,
          sku: off.sku,
          in_stock: off.in_stock,
          category_id,
        });
      }
    }

    // 6) запис у БД
    let created = 0;
    let updatedStock = 0;

    for (const part of chunk(toUpdate, 500)) {
      const { error } = await supabaseAdmin.from("products").upsert(part, {
        onConflict: "id",
        ignoreDuplicates: false,
      });
      if (error) throw error;
      updatedStock += part.length;
    }

    for (const part of chunk(toInsert, 200)) {
      const { error } = await supabaseAdmin.from("products").insert(part);
      if (error) throw error;
      created += part.length;
    }

    // 7) ВАЖЛИВО: товари, яких немає у фіді — НЕ чіпаємо!

    return new Response(
      JSON.stringify({
        ok: true,
        url,
        offers_in_file: offers.length,
        created,
        updated_stock: updatedStock,
        note: "Products not present in feed were left untouched",
      }),
      { headers: { "content-type": "application/json" } },
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }
});
