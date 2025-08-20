// supabase/functions/import_yml/index.ts
// Import rules (final):
// - EXISTING products (by SKU): update ONLY `in_stock`
// - NEW products: insert with all fields (name, sku, price_dropship, in_stock, image_url, gallery_json, description, category_id)
//   If category not present in XML or couldn't be mapped -> insert with category_id = NULL
// - NO category backfill for existing products

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";
import * as xml2js from "https://esm.sh/xml2js@0.6.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const IMPORT_SECRET = Deno.env.get("IMPORT_SECRET") || "";

const db = createClient(SUPABASE_URL, SERVICE_KEY);

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-import-token",
        },
      });
    }

    if (req.method !== "POST") return reply(405, { ok: false, error: "Use POST" });

    // Allow either X-Import-Token or Authorization (when gateway enforces JWT)
    const secret = req.headers.get("x-import-token") || req.headers.get("X-Import-Token");
    const hasAuth = !!req.headers.get("authorization");
    if (IMPORT_SECRET && secret !== IMPORT_SECRET && !hasAuth) {
      return reply(401, { ok: false, error: "Missing or invalid token" });
    }

    // Feed URL
    const u = new URL(req.url);
    let feedUrl = u.searchParams.get("url") || "";
    if (!feedUrl) {
      const body = await req.json().catch(() => ({}));
      if (body?.url) feedUrl = String(body.url);
    }
    if (!feedUrl) return reply(400, { ok: false, error: "Missing url parameter" });

    // Fetch XML
    const resp = await fetch(feedUrl);
    if (!resp.ok) return reply(502, { ok: false, error: `Fetch ${resp.status}` });
    const xmlText = await resp.text();

    // Parse XML
    const parser = new xml2js.Parser({ explicitArray: true, trim: true });
    const parsed = await parser.parseStringPromise(xmlText);

    const cats = parsed?.yml_catalog?.shop?.[0]?.categories?.[0]?.category || [];
    const offers = parsed?.yml_catalog?.shop?.[0]?.offers?.[0]?.offer || [];

    // Map categoryId -> categoryName (from feed)
    const catIdToName: Map<string, string> = new Map();
    for (const c of cats) {
      const id = c?.$?.id ? String(c.$.id) : "";
      const name = (c?._ ?? "").toString().trim();
      if (id && name) catIdToName.set(id, name);
    }

    // Upsert categories by name (so id exists if present). Safe if already present.
    if (catIdToName.size) {
      const uniqueNames = Array.from(new Set(Array.from(catIdToName.values())));
      const payload = uniqueNames.map((name) => ({ name }));
      const { error: upErr } = await db.from("categories").upsert(payload, { onConflict: "name" });
      if (upErr) return reply(500, { ok: false, error: "Categories upsert failed: " + upErr.message });
    }

    // name(lower) -> id (case-insensitive lookup)
    const { data: catRows, error: catErr } = await db.from("categories").select("id, name");
    if (catErr) return reply(500, { ok: false, error: catErr.message });
    const catNameToId = new Map<string, string>(
      (catRows || []).map((r: any) => [String(r.name).trim().toLowerCase(), r.id])
    );

    type Item = {
      sku: string;
      available: boolean;
      name: string;
      price: number;
      pictures: string[];
      image: string | null;
      description: string | null;
      category_id: string | null;
    };

    const items: Item[] = offers.map((off: any) => {
      const id  = off?.$?.id ? String(off.$.id) : "";
      const sku = (off?.vendorCode?.[0]?.toString().trim()) || (id ? `yml-${id}` : "");
      const available = String(off?.$?.available ?? "true").toLowerCase() === "true";
      const name = off?.name?.[0]?.toString().trim() || "";
      const price = Number(String(off?.price?.[0] ?? "").replace(",", ".")) || 0;
      const pictures: string[] = Array.isArray(off?.picture)
        ? off.picture.map((p: any) => String(p).trim()).filter(Boolean)
        : [];
      const image = pictures[0] ?? null;
      const description = off?.description?.[0]?.toString() ?? null;

      const xmlCatId = off?.categoryId?.[0] ? String(off.categoryId[0]) : "";
      const catName = xmlCatId ? (catIdToName.get(xmlCatId) || "") : "";
      const category_id = catName ? (catNameToId.get(catName.trim().toLowerCase()) || null) : null;

      return { sku, available, name, price, pictures, image, description, category_id };
    }).filter((x: Item) => x.sku);

    if (!items.length) return reply(200, { ok: true, offers: 0, message: "No offers" });

    // Load existing SKUs
    const skus = items.map(i => i.sku);
    const { data: existing, error: exErr } = await db
      .from("products")
      .select("sku")
      .in("sku", skus);
    if (exErr) return reply(500, { ok: false, error: exErr.message });
    const existSet = new Set((existing || []).map((r: any) => r.sku));

    const toUpdateTrue: string[] = [];
    const toUpdateFalse: string[] = [];
    const toInsert: any[] = [];
    let inserted_with_category = 0;
    let inserted_without_category = 0;

    for (const it of items) {
      if (existSet.has(it.sku)) {
        (it.available ? toUpdateTrue : toUpdateFalse).push(it.sku);
      } else {
        toInsert.push({
          sku: it.sku,
          name: it.name || it.sku,
          price_dropship: it.price,
          in_stock: it.available,
          image_url: it.image,
          gallery_json: it.pictures,
          description: it.description,
          category_id: it.category_id, // may be null
        });
        if (it.category_id) inserted_with_category++; else inserted_without_category++;
      }
    }

    // Updates (ONLY in_stock)
    if (toUpdateTrue.length) {
      const { error } = await db.from("products").update({ in_stock: true }).in("sku", toUpdateTrue);
      if (error) return reply(500, { ok: false, error: "Update TRUE failed: " + error.message });
    }
    if (toUpdateFalse.length) {
      const { error } = await db.from("products").update({ in_stock: false }).in("sku", toUpdateFalse);
      if (error) return reply(500, { ok: false, error: "Update FALSE failed: " + error.message });
    }

    // Inserts
    if (toInsert.length) {
      for (let i = 0; i < toInsert.length; i += 100) {
        const chunk = toInsert.slice(i, i + 100);
        const { error } = await db.from("products").insert(chunk);
        if (error) return reply(500, { ok: false, error: "Insert failed: " + error.message });
      }
    }

    return reply(200, {
      ok: true,
      offers: items.length,
      updated_true: toUpdateTrue.length,
      updated_false: toUpdateFalse.length,
      inserted: toInsert.length,
      inserted_with_category,
      inserted_without_category
    });
  } catch (e) {
    return reply(500, { ok: false, error: String((e as any)?.message ?? e) });
  }
});
