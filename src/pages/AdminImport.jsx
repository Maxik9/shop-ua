import { useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

/**
 * Підтримувані колонки (перший рядок — заголовки):
 * sku, name, description, price_dropship, category_id, image_url,
 * images (через кому), image1..image10,
 * in_stock / active (1/0, true/false/yes/no)
 *
 * Перше фото стає головним (image_url). Решта — gallery_json.
 * Upsert за SKU.
 */
export default function AdminImport() {
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function onFile(e) {
    setMsg('')
    const f = e.target.files?.[0]
    if (!f) return
    try {
      // динамічний імпорт, щоб уникнути проблем збірки
      const XLSX = (await import('xlsx')).default
      const buf = await f.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(ws, { defval: '' }) // [{col:value,...}]
      setRows(json)
    } catch (err) {
      setMsg('Помилка читання XLSX: ' + (err.message || ''))
    }
  }

  const preview = useMemo(() => {
    return rows.slice(0, 20).map(r => ({
      sku: String(r.sku || r.SKU || '').trim(),
      name: r.name || r.назва || '',
      price: Number(r.price_dropship || r.price || 0),
      photos: collectPhotos(r).length,
      stock: parseStock(r),
    }))
  }, [rows])

  function parseStock(r) {
    const raw = (r.in_stock ?? r.active ?? '').toString().trim().toLowerCase()
    if (['1', 'true', 'yes', 'y', 'так', 'да'].includes(raw)) return true
    if (['0', 'false', 'no', 'n', 'ні', 'нет'].includes(raw)) return false
    return true // за замовчуванням в наявності
  }

  function collectPhotos(r) {
    const photos = []
    const images = r.images || r.IMAGES || ''
    if (images) {
      images.split(',').map(s => s.trim()).filter(Boolean).forEach(u => photos.push(u))
    }
    for (let i = 1; i <= 10; i++) {
      const k = `image${i}`
      if (r[k]) photos.push(String(r[k]).trim())
    }
    const main = r.image_url || r.image || ''
    if (main) photos.unshift(String(main).trim())
    // унікалізація
    return Array.from(new Set(photos.filter(Boolean)))
  }

  async function doImport() {
    if (!rows.length) return
    setBusy(true); setMsg('')
    try {
      const payload = rows.map(r => {
        const sku = String(r.sku || r.SKU || '').trim()
        const name = r.name || r.назва || ''
        const description = r.description || r.desc || ''
        const price = Number(r.price_dropship || r.price || 0)
        const photos = collectPhotos(r)
        const in_stock = parseStock(r)

        const image_url = photos[0] || null
        const gallery_json = photos.slice(1)

        return { sku, name, description, price_dropship: price, image_url, gallery_json, in_stock }
      }).filter(x => x.sku && x.name)

      const { error } = await supabase
        .from('products')
        .upsert(payload, { onConflict: 'sku' })

      if (error) throw error
      setMsg(`Імпортовано ${payload.length} записів`)
    } catch (e) {
      setMsg('Помилка імпорту: ' + (e.message || ''))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container-page py-6">
      <h1 className="h1 mb-4">Імпорт товарів (XLSX)</h1>

      <div className="card mb-4">
        <div className="card-body">
          <div className="text-sm text-muted mb-2">
            Перший рядок — заголовок. Підтримуються колонки:
            <br/>
            <code>sku, name, description, price_dropship, category_id, image_url, images, image1..image10, in_stock/active</code>.
            Перше фото стає головним.
          </div>

          <input type="file" accept=".xlsx,.xls" className="input" onChange={onFile} />

          <div className="mt-3">
            <button className="btn-primary" disabled={!rows.length || busy} onClick={doImport}>
              Імпортувати {rows.length} записів
            </button>
            {msg && <span className="text-sm text-muted ml-3">{msg}</span>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="font-medium mb-2">Попередній перегляд (перші 20):</div>
          <div className="space-y-2 text-sm">
            {preview.map((r,i)=>(
              <div key={i} className="flex items-center gap-3 border rounded-lg px-3 py-2">
                <div className="w-28 truncate">{r.sku}</div>
                <div className="flex-1 min-w-0 truncate">{r.name}</div>
                <div className="w-24 text-right">{(r.price||0).toFixed(2)} ₴</div>
                <div className="w-20 text-center">{r.photos} фото</div>
                <div className="w-28 text-center">
                  {r.stock ? 'в наявності' : 'немає'}
                </div>
              </div>
            ))}
            {!preview.length && <div className="text-muted">Файл не обрано або порожній.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
