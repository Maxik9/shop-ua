// supabase/functions/import_yml/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?dts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); // якщо є — обійдемо RLS
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const IMPORT_SECRET = Deno.env.get("IMPORT_SECRET") ?? "123321";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY ?? ANON_KEY!, {
  auth: { persistSession: false },
  global: { fetch },
});

// utils
const slugify = (s: string) =>
  s.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\u0400-\u04FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 120) || "cat";

const txt = (el: Element | null | undefined) => (el?.textContent ?? "").trim();
const num = (s: string | null | undefined) => {
  const n = parseFloat((s ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    // секрет
    const secret = req.headers.get("x-import-secret");
    if (!secret || secret !== IMPORT_SECRET) {
      return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const feedUrl: string | undefined = body?.url;
    const debug: boolean = !!body?.debug;
    if (!feedUrl) return Response.json({ ok: false, error: "Missing url" }, { status: 400 });

    // 1) тягнемо XML
    const resp = await fetch(feedUrl);
    if (!resp.ok) return Response.json({ ok: false, error: `Fetch ${resp.status}` }, { status: 502 });
    const xml = await resp.text();

    // 2) парсимо
    const dom = new DOMParser().parseFromString(xml, "text/xml");
    if (!dom) return Response.json({ ok: false, error: "Bad XML" }, { status: 400 });

    // ---------- КАТЕГОРІЇ: зібрати → upsert → ще раз прочитати → зробити мапу ----------
    type YmlCat = { ymlId: string; name: string; slug: string };
    const foundCats: YmlCat[] = [];
    const seenSlugs = new Set<string>();

    dom.querySelectorAll("categories > category, category").forEach((c) => {
      const id = c.getAttribute("id")?.trim();
      const name = txt(c);
      if (!id || !name) return;
      let slug = slugify(name);
      let trySlug = slug, i = 2;
      while (seenSlugs.has(trySlug)) trySlug = `${slug}-${i++}`;
      seenSlugs.add(trySlug);
      foundCats.push({ ymlId: id, name, slug: trySlug });
    });

    // upsert по slug
    let ymlIdToDbId = new Map<string, string>();
    if (foundCats.length) {
      const upRows = foundCats.map((c) => ({ name: c.name, slug: c.slug }));
      const { error: upErr } = await supabase
        .from("categories")
        .upsert(upRows, { onConflict: "slug" });
      if (upErr) {
        return Response.json({ ok: false, error: `Categories upsert: ${upErr.message}` }, { status: 500 });
      }

      // другий прохід — беремо id
      const slugs = [...foundCats.map((c) => c.slug)];
      const { data: got, error: selErr } = await supabase
        .from("categories")
        .select("id, slug")
        .in("slug", slugs);

      if (selErr) {
        return Response.json({ ok: false, error: `Categories select: ${selErr.message}` }, { status: 500 });
      }
      const slugToId = new Map<string, string>();
      (got ?? []).forEach((r) => slugToId.set(r.slug, r.id));
      for (const c of foundCats) {
        const id = slugToId.get(c.slug);
        if (id) ymlIdToDbId.set(c.ymlId, id);
      }
    }

    // зручна мапа id→name для додаткових перевірок
    const ymlIdToName = new Map<string, string>();
    foundCats.forEach((c) => ymlIdToName.set(c.ymlId, c.name));

    // ---------- ТОВАРИ ----------
    const offers = dom.getElementsByTagName("offer");
    const stats = {
      offers: offers.length,
      created: 0,
      updatedStock: 0,
      skippedNoSku: 0,
      missedCategory: 0,
      errors: [] as Array<{ sku?: string; msg: string }>,
    };

    for (const offer of offers) {
      try {
        const available = (offer.getAttribute("available") ?? "").toLowerCase() === "true";
        const name = txt(offer.getElementsByTagName("name")[0]);
        const price = num(txt(offer.getElementsByTagName("price")[0]));
        const desc = txt(offer.getElementsByTagName("description")[0]);
        const vendorCode = txt(offer.getElementsByTagName("vendorCode")[0]);
        const sku = vendorCode || "";
        if (!sku) { stats.skippedNoSku++; continue; }

        // картинки
        const pics = Array.from(offer.getElementsByTagName("picture"))
          .map((p) => txt(p)).filter(Boolean);
        const image_url = pics[0] || null;
        const gallery = pics;

        // категорія з offer
        const ymlCatId = txt(offer.getElementsByTagName("categoryId")[0]);
        let category_id: string | null = null;

        if (ymlCatId) {
          category_id = ymlIdToDbId.get(ymlCatId) ?? null;

          // якщо не знайшли — перестрахуємось: зробимо one-shot upsert цієї категорії за name
          if (!category_id) {
            const cname = ymlIdToName.get(ymlCatId);
            if (cname) {
              const cslug = slugify(cname);
              const { data: one, error: oneErr } = await supabase
                .from("categories")
                .upsert({ name: cname, slug: cslug }, { onConflict: "slug" })
                .select("id")
                .single();
              if (!oneErr && one?.id) {
                category_id = one.id;
                ymlIdToDbId.set(ymlCatId, one.id); // запам’ятаємо на майбутнє
              }
            }
          }

          if (!category_id) {
            stats.missedCategory++;
            if (debug) console.log("missed category for catId:", ymlCatId, "name:", ymlIdToName.get(ymlCatId));
          }
        }

        // чи існує товар зі SKU?
        const { data: exist, error: selErr } = await supabase
          .from("products")
          .select("id")
          .eq("sku", sku)
          .maybeSingle();
        if (selErr) { stats.errors.push({ sku, msg: selErr.message }); continue; }

        if (exist) {
          // оновлюємо тільки наявність
          const { error: upErr } = await supabase
            .from("products")
            .update({ in_stock: available, updated_at: new Date().toISOString() })
            .eq("id", exist.id);
          if (upErr) stats.errors.push({ sku, msg: upErr.message });
          else stats.updatedStock++;
        } else {
          // новий товар — з category_id
          const { error: insErr } = await supabase
            .from("products")
            .insert({
              sku,
              name,
              description: desc,
              price_dropship: price,
              in_stock: available,
              category_id,          // тут ставиться категорія
              image_url,
              gallery_json: gallery,
              created_at: new Date().toISOString(),
            });
          if (insErr) stats.errors.push({ sku, msg: insErr.message });
          else stats.created++;
        }
      } catch (e) {
        stats.errors.push({ msg: e?.message ?? String(e) });
      }
    }

    const res = { ok: true, ...stats };
    if (debug) console.log("import_yml stats:", res);
    return Response.json(res);
  } catch (e) {
    return Response.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
});
