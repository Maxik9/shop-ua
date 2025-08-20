import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { XMLParser } from "https://esm.sh/fast-xml-parser@4.3.6";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY =
  Deno.env.get("SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // fallback, якщо колись був
const IMPORT_SECRET = Deno.env.get("IMPORT_SECRET") ?? "";
const ANON_KEY = Deno.env.get("ANON_KEY") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: true,
});

function toArray<T>(v: T | T[] | undefined | null): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function boolFromAvailable(a: unknown): boolean {
  // <offer available="true|false">
  if (typeof a === "string") return a.toLowerCase() === "true";
  if (typeof a === "boolean") return a;
  return false;
}

function pickSku(offer: any): string | null {
  // найчастіші поля в YML: <vendorCode>, іноді через param
  const params = toArray(offer.param);
  const byParam = (name: string) =>
    params.find((p: any) => (p?.name ?? "").toLowerCase() === name.toLowerCase())?.["#text"];

  const sku =
    offer.vendorCode ??
    offer.vendorcode ??
    offer.vendor_code ??
    byParam("sku") ??
    byParam("артикул") ??
    byParam("код/артикул") ??
    null;

  return typeof sku === "string" && sku.trim() ? sku.trim() : null;
}

async function upsertCategoryByName(name: string): Promise<string | null> {
  if (!name || !name.trim()) return null;
  const slug = slugify(name);
  const { data, error } = await admin
    .from("categories")
    .upsert({ name, slug }, { onConflict: "slug" })
    .select("id")
    .single();

  if (error) {
    console.warn("Category upsert failed:", error.message);
    return null;
  }
  return data?.id ?? null;
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 1) Додаткова перевірка секрету
    const secretHeader = req.headers.get("X-Import-Secret");
    if (!IMPORT_SECRET || secretHeader !== IMPORT_SECRET) {
      return new Response(JSON.stringify({ ok: false, error: "forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2) Body
    const body = await req.json().catch(() => ({}));
    const feedUrl = (body?.url ?? "").toString().trim();
    if (!feedUrl || !/^https?:\/\//i.test(feedUrl)) {
      return new Response(JSON.stringify({ ok: false, error: "Missing url parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3) Завантажуємо YML/XML
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 60_000);
    const resp = await fetch(feedUrl, { signal: ac.signal });
    clearTimeout(timer);

    if (!resp.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: `Feed fetch failed: ${resp.status} ${resp.statusText}` }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    const xml = await resp.text();
    const parsed = parser.parse(xml);

    // 4) Витягуємо категорії та оффери
    const shop = parsed?.yml_catalog?.shop ?? parsed?.shop ?? parsed;
    const categoriesRaw = toArray(shop?.categories?.category);
    const offersRaw = toArray(shop?.offers?.offer);

    // карта id->name з фіда
    const catNameById = new Map<string, string>();
    for (const c of categoriesRaw) {
      const id = (c?.id ?? "").toString();
      const nm = (c?.["#text"] ?? c?.name ?? "").toString().trim();
      if (id && nm) catNameById.set(id, nm);
    }

    let created = 0;
    let updatedStock = 0;
    let skippedNoSku = 0;
    let total = 0;
    const errors: string[] = [];

    // Кешування створених категорій у рамках одного запуску
    const catIdCache = new Map<string, string | null>(); // name -> id

    // 5) Обробка пропозицій
    for (const raw of offersRaw) {
      total++;

      const sku = pickSku(raw);
      if (!sku) {
        skippedNoSku++;
        continue;
      }

      // чи є в БД такий SKU?
      const { data: existing, error: selErr } = await admin
        .from("products")
        .select("id,in_stock")
        .eq("sku", sku)
        .maybeSingle();

      if (selErr) {
        errors.push(`select ${sku}: ${selErr.message}`);
        continue;
      }

      const available = boolFromAvailable(raw?.available);
      if (existing) {
        // ОНОВЛЮЄМО ЛИШЕ in_stock
        if (existing.in_stock !== available) {
          const { error: upErr } = await admin
            .from("products")
            .update({ in_stock: available })
            .eq("id", existing.id);
          if (upErr) errors.push(`update stock ${sku}: ${upErr.message}`);
          else updatedStock++;
        }
        continue;
      }

      // Новий товар — створюємо
      const name = (raw?.name ?? "").toString().trim();
      const price = Number(raw?.price ?? NaN);
      if (!name || !isFinite(price)) {
        // без назви/ціни не створюємо
        continue;
      }

      // опис
      const description = (raw?.description ?? "").toString();

      // зображення
      const pictures = toArray<string>(raw?.picture).map((p) => p.toString());
      const image_url = pictures[0] ?? null;
      const gallery_json = pictures.length ? pictures : [];

      // категорія з фіда → створюємо/знаходимо у БД
      let category_id: string | null = null;
      const remoteCatId = (raw?.categoryId ?? raw?.category_id ?? "").toString();
      if (remoteCatId && catNameById.has(remoteCatId)) {
        const catName = catNameById.get(remoteCatId)!;
        if (catIdCache.has(catName)) {
          category_id = catIdCache.get(catName)!;
        } else {
          category_id = await upsertCategoryByName(catName);
          catIdCache.set(catName, category_id);
        }
      }

      const insertPayload: any = {
        name,
        description,
        price_dropship: Math.round(price * 100) / 100,
        sku,
        in_stock: available,
        category_id,
      };
      if (image_url) insertPayload.image_url = image_url;
      if (gallery_json.length) insertPayload.gallery_json = gallery_json;

      const { error: insErr } = await admin.from("products").insert(insertPayload);
      if (insErr) errors.push(`insert ${sku}: ${insErr.message}`);
      else created++;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        offers: total,
        created,
        updatedStock,
        skippedNoSku,
        errors,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message ?? "unknown" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
