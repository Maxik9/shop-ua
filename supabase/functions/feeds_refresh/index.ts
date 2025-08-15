import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { XMLParser } from 'npm:fast-xml-parser@4'

// ---- ENV ----
// Prefer new names (PROJECT_URL / SERVICE_ROLE_KEY), fallback to legacy names.
const SUPABASE_URL = Deno.env.get('PROJECT_URL') ?? Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY  = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// ---- helpers ----
function getByPath(obj: any, path?: string | null){
  if(!obj || !path) return undefined
  const parts = path.split('.').filter(Boolean)
  let cur: any = obj
  for(const p of parts){ if(cur == null) return undefined; cur = cur[p] }
  return cur
}
function toArray<T=any>(v:any): T[]{ return Array.isArray(v) ? v : (v == null ? [] : [v]) }
function normBool(v:any): boolean{
  if(typeof v === 'boolean') return v
  const s = String(v ?? '').trim().toLowerCase()
  if(!s) return false
  if(!isNaN(+s)) return (+s) > 0
  // covers: attribute available="true", 'в наличии', etc
  return ['true','yes','y','1','в наличии','в наявності','есть','available','instock','in stock'].some(w=>s.includes(w))
}
function normPrice(v:any): number | null {
  if (v==null) return null
  const s = String(v).replace(',', '.').replace(/[^\d.]/g, '')
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

const parser = new XMLParser({
  ignoreAttributes:false, attributeNamePrefix:'', parseTagValue:true, parseAttributeValue:true, trimValues:true
})

async function fetchXml(url:string){
  const r = await fetch(encodeURI(url))
  if(!r.ok) throw new Error(`HTTP ${r.status}`)
  return await r.text()
}
function parseItems(xml:string, path:string){
  const data = parser.parse(xml)
  const parts = path.split('.').filter(Boolean)
  let cur:any = data
  for(const p of parts){ if(cur == null) break; cur = cur[p] }
  return Array.isArray(cur) ? cur : (cur == null ? [] : [cur])
}

// ---- operations ----

async function opStockOnly(feed:any): Promise<number>{
  const xml = await fetchXml(feed.url)
  const items = parseItems(xml, feed.item_path)

  const updates: { sku: string, in_stock: boolean }[] = []
  for(const it of items){
    const sku = String(getByPath(it, feed.sku_path) ?? '').trim()
    if(!sku) continue
    const in_stock = normBool(getByPath(it, feed.stock_path))
    updates.push({ sku, in_stock })
  }
  if(!updates.length) return 0

  // no .in() pitfalls: pull all sku from products and compare locally
  const { data: rows, error: selErr } = await supabase.from('products').select('sku')
  if (selErr) throw selErr
  const existing = new Set((rows ?? []).map((r: any) => r.sku as string))

  const toUpsert = updates.filter(u => existing.has(u.sku))
  if(!toUpsert.length) return 0

  let updated = 0
  const CHUNK = 500
  for(let i=0;i<toUpsert.length;i+=CHUNK){
    const slice = toUpsert.slice(i,i+CHUNK)
    const { error } = await supabase.from('products').upsert(slice, { onConflict:'sku' })
    if (error) throw error
    updated += slice.length
  }
  return updated
}

async function opFullImport(feed:any): Promise<number>{
  const xml = await fetchXml(feed.url)
  const items = parseItems(xml, feed.item_path)

  const rows: any[] = []
  for(const it of items){
    const sku = String(getByPath(it, feed.sku_path) ?? '').trim()
    if(!sku) continue
    const name = getByPath(it, feed.name_path)
    const description = getByPath(it, feed.description_path)
    const price = feed.price_path ? normPrice(getByPath(it, feed.price_path)) : null
    const in_stock = normBool(getByPath(it, feed.stock_path))

    const photosRaw = toArray<string>(getByPath(it, feed.photo_path)).map(String).map(s=>s.trim()).filter(Boolean)
    const uniquePhotos = Array.from(new Set(photosRaw))
    const image_url = uniquePhotos[0] || null
    const gallery_json = uniquePhotos.length ? uniquePhotos : null

    rows.push({
      sku,
      name: name != null ? String(name) : null,
      description: description != null ? String(description) : null,
      price_dropship: price,
      in_stock,
      image_url,
      gallery_json
    })
  }
  if(!rows.length) return 0

  let upserted = 0
  const CHUNK = 300
  for(let i=0;i<rows.length;i+=CHUNK){
    const slice = rows.slice(i,i+CHUNK)
    const { error } = await supabase.from('products').upsert(slice, { onConflict:'sku' })
    if (error) throw error
    upserted += slice.length
  }
  return upserted
}

// ---- handler ----
Deno.serve( async (req) => {
  try{
    const body = await req.json().catch(()=>({}))
    const op = body?.op as 'full_import' | 'stock_only' | undefined
    const oneId = body?.feed_id as string | undefined

    let feeds:any[] = []
    if(oneId){
      const { data, error } = await supabase.from('supplier_feeds').select('*').eq('id', oneId).maybeSingle()
      if (error) throw error
      if (data) feeds = [data as any]
    }else{
      const { data, error } = await supabase.from('supplier_feeds').select('*').eq('enabled', true)
      if (error) throw error
      feeds = (data || []) as any[]
    }

    let total = 0
    for(const f of feeds){
      try{
        const n = op === 'full_import' ? await opFullImport(f) : await opStockOnly(f)
        total += n
        await supabase.from('supplier_feeds').update({ last_run: new Date().toISOString(), last_status: `ok: ${n}` }).eq('id', f.id)
      }catch(e:any){
        await supabase.from('supplier_feeds').update({ last_run: new Date().toISOString(), last_status: `error: ${e.message || e}` }).eq('id', f.id)
      }
    }
    return new Response(JSON.stringify({ ok:true, updated: total }), { headers: { 'content-type':'application/json' } })
  }catch(e:any){
    return new Response(JSON.stringify({ ok:false, error: e.message || String(e) }), { status: 500 })
  }
})
