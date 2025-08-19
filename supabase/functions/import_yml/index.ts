// supabase/functions/import_yml/index.ts
// Import YML/XML by URL -> upsert categories & products
// Auth: 
// 1) Preferred: Bearer user token (must be admin via public.is_admin).
// 2) Fallback: X-Import-Token header must equal IMPORT_SECRET (set via supabase secrets).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";
import { XMLParser } from "https://esm.sh/fast-xml-parser@4.5.0";

type Cat = { "@_id": string; "#text": string };
type Offer = {
  "@_id"?: string;
  "@_available"?: string | boolean;
  url?: string;
  price?: string | number | null;
  oldprice?: string | number | null;
  currencyId?: string;
  categoryId?: string;
  name?: string;
  description?: string;
  vendor?: string;
  vendorCode?: string;
  picture?: string[] | string | null;
};
type Yml = {
  yml_catalog?: {
    shop?: {
      categories?: { category?: Cat[] };
      offers?: { offer?: Offer[] };
    };
  };
};

function slugify(input: string) {
  return String(input || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\u0400-\u04FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 120);
}
function toArray(p: string[] | string | null | undefined): string[] {
  if (!p) return [];
  return Array.isArray(p) ? p.filter(Boolean) : [p].filter(Boolean);
}
function toNumber(x: unknown): number | null {
  if (x == null || x === "") return null;
  const n = Number(String(x).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type, x-import-token",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  try {
    if (req.method !== "POST") return j({ error: "Use POST" }, 405);
    const { url } = await req.json().catch(() => ({}));
    if (!url || typeof url !== "string") return j({ error: "Body must be { url }" }, 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const IMPORT_SECRET = Deno.env.get("IMPORT_SECRET") || "";

    if (!SUPABASE_URL || !SERVICE_ROLE) return j({ error: "Missing Supabase env" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    const tokenSecret = req.headers.get("X-Import-Token") ?? "";

    let isAdmin = false;
    if (authHeader) {
      // Verify user token and role via RPC
      const authClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userRes } = await authClient.auth.getUser();
      const uid = userRes?.user?.id;
      if (uid) {
        const { data: ok } = await authClient.rpc("is_admin", { u: uid });
        isAdmin = Boolean(ok);
      }
    }
    if (!isAdmin && IMPORT_SECRET && tokenSecret && IMPORT_SECRET == tokenSecret) {
      isAdmin = true; // allow secret override
    }
    if (!isAdmin) return j({ error: "Forbidden (admin only)" }, 403);

    // Admin client for writes
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1) Fetch XML
    const resp = await fetch(url);
    if (!resp.ok) return j({ error: `Fetch ${resp.status}` }, 502);
    const xml = await resp.text();

    // 2) Parse
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      trimValues: true,
      allowBooleanAttributes: true,
      parseTagValue: false,
      parseAttributeValue: false,
    });
    const data = parser.parse(xml) as Yml;
    const categoriesRaw = data?.yml_catalog?.shop?.categories?.category ?? [];
    const offersRaw = data?.yml_catalog?.shop?.offers?.offer ?? [];

    // 3) Upsert categories by slug(name)
    const uniqSlugMap = new Map<string, string>();
    for (const c of categoriesRaw) {
      const nm = c?.["#text"]?.trim();
      if (!nm) continue;
      uniqSlugMap.set(slugify(nm), nm);
    }
    const slugEntries = Array.from(uniqSlugMap.entries());
    const catSlugToId = new Map<string, string>();
    for (let i = 0; i < slugEntries.length; i += 100) {
      const chunk = slugEntries.slice(i, i + 100).map(([slug, name]) => ({
        name, slug, image_url: null, sort_order: 0,
      }));
      const { data: rows, error } = await admin
        .from("categories")
        .upsert(chunk, { onConflict: "slug" })
        .select("id, slug");
      if (error) return j({ error: error.message }, 500);
      rows?.forEach((r: any) => catSlugToId.set(r.slug, r.id));
    }
    if (catSlugToId.size === 0) {
      const { data: rows } = await admin.from("categories").select("id, slug");
      rows?.forEach((r: any) => catSlugToId.set(r.slug, r.id));
    }

    // 4) Upsert products by sku
    let total = 0, failed = 0;
    const catsById = new Map(categoriesRaw.map((c) => [String(c["@_id"]), c["#text"]]));
    for (let i = 0; i < offersRaw.length; i += 100) {
      const batch = offersRaw.slice(i, i + 100);
      const rows = batch.map((o) => {
        const offerId = String(o?.["@_id"] ?? "");
        const availRaw = String(o?.["@_available"] ?? "true").toLowerCase();
        const available = availRaw === "true";
        const price = toNumber(o?.price) ?? 0;
        const name = (o?.name ?? "").toString().trim();
        const description = (o?.description ?? "").toString() || null;
        const vendorCode = (o?.vendorCode ?? "").toString().trim();
        const sku = vendorCode ? vendorCode : (offerId ? `yml-${offerId}` : "");
        const pictures = toArray(o?.picture);
        const first = pictures[0] ?? null;

        const catIdText = (o?.categoryId ?? "").toString();
        const catName = catsById.get(catIdText) as string | undefined;
        const catSlug = catName ? slugify(catName) : null;
        const category_id = catSlug ? (catSlugToId.get(catSlug) ?? null) : null;

        return {
          sku,
          name,
          description,
          price_dropship: price,
          in_stock: available,
          image_url: first,
          gallery_json: pictures, // array -> JSONB
          category_id,
        };
      }).filter(r => r.sku && r.name);

      if (rows.length === 0) continue;
      const { data: up, error } = await admin
        .from("products")
        .upsert(rows, { onConflict: "sku" })
        .select("id");
      if (error) failed += rows.length;
      else total += up?.length ?? rows.length;
    }

    return j({
      ok: true,
      categories_seen: categoriesRaw.length,
      categories_upserted: catSlugToId.size,
      offers_seen: offersRaw.length,
      products_upserted: total,
      products_failed: failed,
    });
  } catch (e) {
    return j({ error: String((e as any)?.message ?? e) }, 500);
  }
});

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
