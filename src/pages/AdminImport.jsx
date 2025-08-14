// src/pages/AdminImport.jsx
import { useMemo, useState, useRef } from 'react'
import { supabase } from '../supabaseClient'
import readXlsxFile from 'read-excel-file'

/**
 * Підтримувані колонки (перший рядок — заголовки):
 * sku, name, description, price_dropship (або price), category_id, category_name,
 * image_url, images (через кому), image1..image10,
 * in_stock / active (1/0, true/false/yes/no)
 *
 * Перше фото стає головним (image_url). Решта — gallery_json (масив).
 * Upsert за SKU (у таблиці products має бути UNIQUE(sku)).
 */
export default function AdminImport() {
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [createMissingCats, setCreateMissingCats] = useState(true)
  const inputRef = useRef(null)

  // ---- helpers --------------------------------------------------------------
  const truthy = (v) => {
    if (typeof v === 'boolean') return v
    const s = String(v ?? '').trim().toLowerCase()
    return ['1','true','yes','y','так','ok','on','в наявності'].includes(s)
  }

  const toPrice = (v) => {
    const n = Number(String(v ?? '').replace(',', '.').replace(/[^\d.]/g, ''))
    return Number.isFinite(n) ? n : 0
  }

  const norm = (s) => (s == null ? '' : String(s).trim())

  const headerMap = (headers) => {
    const normalized = headers.map(h => norm(h).toLowerCase())
    const idx = (name) => normalized.indexOf(name)
    return {
      idxSku: idx('sku'),
      idxName: idx('name'),
      idxDesc: idx('description'),
      idxPriceDS: idx('price_dropship'),
      idxPrice: idx('price'),
      idxCatId: idx('category_id'),
      idxCatName: idx('category_name'),
      idxImageUrl: idx('image_url'),
      idxImages: idx('images'),
      idxImageCols: normalized
        .map((h, i) => ({ h, i }))
        .filter(x => /^image[1-9]\d*$/.test(x.h))
        .map(x => x.i),
      idxInStock: idx('in_stock'),
      idxActive: idx('active'),
    }
  }

  const parseRow = (arr, map) => {
    const get = (i) => (i >= 0 ? arr[i] : '')
    const sku = norm(get(map.idxSku))
    if (!sku) return null

    const name = norm(get(map.idxName))
    const description = norm(get(map.idxDesc))
    const price = map.idxPriceDS >= 0 ? toPrice(get(map.idxPriceDS)) : toPrice(get(map.idxPrice))
    const category_id_raw = norm(get(map.idxCatId))
    const category_name = norm(get(map.idxCatName))

    // Images
    const list = []
    const imageUrl = norm(get(map.idxImageUrl))
    if (imageUrl) list.push(imageUrl)

    const imagesJoined = norm(get(map.idxImages))
    if (imagesJoined) {
      for (const p of imagesJoined.split(',').map(s => norm(s))) if (p) list.push(p)
    }
    for (const i of map.idxImageCols) {
      const v = norm(get(i))
      if (v) list.push(v)
    }
    // унікалізація
    const seen = new Set()
    const urls = list.filter(u => {
      const k = u.trim()
      if (!k || seen.has(k)) return false
      seen.add(k)
      return true
    })

    const image_url = urls[0] || ''
    const gallery_json = urls.slice(1)

    const in_stock = truthy(get(map.idxInStock))
    const active = map.idxActive >= 0 ? truthy(get(map.idxActive)) : true

    return {
      sku, name, description, price,
      category_id_raw, category_name,
      image_url, gallery_json,
      in_stock, active,
    }
  }

  // ---- file parsing ---------------------------------------------------------
  const parseCSV = (text) => {
    // простий CSV (роздільник ","); для складних випадків можна поставити 'papaparse'
    const rows = text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => l.split(',').map(s => s.trim()))
    if (!rows.length) throw new Error('Порожній файл')
    return rows
  }

  const onFile = async (file) => {
    setRows([]); setError(''); setMsg('')
    if (!file) return
    setFileName(file.name)

    try {
      const ext = file.name.split('.').pop().toLowerCase()

      let matrix = []
      if (ext === 'csv') {
        const text = await file.text()
        matrix = parseCSV(text)
      } else if (ext === 'xlsx' || ext === 'xls') {
        // read-excel-file повертає масив масивів: [ [headers...], [row...], ... ]
        matrix = await readXlsxFile(file, { dateFormat: 'MM/DD/YY' })
      } else {
        throw new Error('Підтримуються .csv та .xlsx')
      }

      if (!matrix.length) throw new Error('Порожній аркуш/файл')
      const headers = matrix[0]
      const map = headerMap(headers)

      const data = []
      for (let i = 1; i < matrix.length; i++) {
        const r = parseRow(matrix[i], map)
        if (r) data.push(r)
      }
      setRows(data)
    } catch (e) {
      console.error(e)
      setError(e.message || 'Помилка читання файлу')
    }
  }

  const preview = useMemo(() => rows.map(r => ({
    sku: r.sku,
    name: r.name || '(без назви)',
    price: r.price || 0,
    photos: (r.image_url ? 1 : 0) + (r.gallery_json?.length || 0),
    stock: r.in_stock,
    cat: r.category_id_raw || r.category_name || '',
  })), [rows])

  // ---- import to Supabase ---------------------------------------------------
  const importAll = async () => {
    if (!rows.length) { setError('Спочатку оберіть файл'); return }
    setBusy(true); setError(''); setMsg('Підготовка…')

    try {
      // 1) Підтягнемо існуючі категорії та створимо відсутні (за name)
      const needNames = new Set(rows.map(r => r.category_name).filter(Boolean))
      const catMapByName = new Map()

      if (needNames.size) {
        const { data: cats, error: eCats } = await supabase.from('categories').select('id,name')
        if (eCats) throw eCats
        for (const c of cats || []) catMapByName.set(norm(c.name).toLowerCase(), c.id)

        if (createMissingCats) {
          const toCreate = []
          for (const nm of needNames) {
            const key = norm(nm).toLowerCase()
            if (key && !catMapByName.has(key)) toCreate.push({ name: nm })
          }
          if (toCreate.length) {
            const { data: created, error: eIns } = await supabase.from('categories').insert(toCreate).select('id,name')
            if (eIns) throw eIns
            for (const c of created || []) catMapByName.set(norm(c.name).toLowerCase(), c.id)
          }
        }
      }

      // 2) Підготуємо payload для upsert
      const payload = rows.map(r => {
        let category_id = null
        if (r.category_id_raw) {
          const n = Number(r.category_id_raw)
          category_id = Number.isFinite(n) && n > 0 ? n : null
        }
        if (!category_id && r.category_name) {
          const k = norm(r.category_name).toLowerCase()
          category_id = catMapByName.get(k) || null
        }

        return {
          sku: r.sku,
          name: r.name || null,
          description: r.description || null,
          price: r.price || 0,
          category_id,
          image_url: r.image_url || null,
          gallery_json: r.gallery_json?.length ? r.gallery_json : null,
          in_stock: !!r.in_stock,
          active: !!r.active,
        }
      })

      const valid = payload.filter(p => p.sku && String(p.sku).trim().length)
      if (!valid.length) throw new Error('Жодного валідного SKU')

      // 3) Chunked upsert (щоб не впертись у ліміти)
      const chunk = (arr, size) => {
        const out = []
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
        return out
      }
      const parts = chunk(valid, 200)
      let total = 0
      for (let i = 0; i < parts.length; i++) {
        setMsg(`Імпорт ${i + 1}/${parts.length}…`)
        const { error: upErr } = await supabase.from('products').upsert(parts[i], { onConflict: 'sku' })
        if (upErr) throw upErr
        total += parts[i].length
      }
      setMsg(`Готово: імпортовано ${total} товарів`)
    } catch (e) {
      console.error(e)
      setError(e.message || 'Помилка імпорту')
    } finally {
      setBusy(false)
    }
  }

  // ---- UI -------------------------------------------------------------------
  const handleChoose = () => inputRef.current?.click()

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-semibold">Імпорт товарів</h1>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4"
              checked={createMissingCats}
              onChange={e => setCreateMissingCats(e.target.checked)}
            />
            <span>Створювати відсутні категорії (за <code>category_name</code>)</span>
          </label>
          <button
            disabled={busy || !rows.length}
            onClick={importAll}
            className="h-10 px-4 rounded-lg bg-indigo-600 text-white disabled:opacity-50"
          >
            {busy ? 'Імпорт…' : 'Імпортувати'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border p-4 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            className="hidden"
          />
          <button onClick={handleChoose} className="h-10 px-4 rounded-lg border">
            Обрати файл
          </button>
          <div className="text-sm text-slate-600">{fileName || 'Файл не обрано'}</div>

          <a
            href="sandbox:/mnt/data/import_template_fixed.xlsx"
            download
            className="ml-auto h-10 px-4 rounded-lg border"
            title="Завантажити шаблон XLSX"
          >
            Завантажити шаблон
          </a>
        </div>

        {(msg || error) && (
          <div className="mt-3 text-sm">
            {msg && <div className="text-emerald-700">{msg}</div>}
            {error && <div className="text-red-600">{error}</div>}
          </div>
        )}

        <div className="mt-6">
          <h2 className="text-lg font-medium mb-2">Превʼю</h2>
          <div className="overflow-auto rounded-lg border">
            <div className="min-w-[720px]">
              <div className="flex items-center px-3 py-2 bg-slate-50 border-b text-xs font-semibold text-slate-600">
                <div className="w-32">SKU</div>
                <div className="flex-1 min-w-0">Назва</div>
                <div className="w-24 text-right">Ціна</div>
                <div className="w-20 text-center">Фото</div>
                <div className="w-28 text-center">Наявність</div>
                <div className="w-40 text-slate-500">Категорія (id або name)</div>
              </div>
              {preview.map((r) => (
                <div key={r.sku} className="flex items-center px-3 py-2 border-b text-sm">
                  <div className="w-32 truncate">{r.sku}</div>
                  <div className="flex-1 min-w-0 truncate">{r.name}</div>
                  <div className="w-24 text-right">{(r.price || 0).toFixed(2)} ₴</div>
                  <div className="w-20 text-center">{r.photos} фото</div>
                  <div className="w-28 text-center">{r.stock ? 'в наявності' : 'немає'}</div>
                  <div className="w-40 truncate">{r.cat || ''}</div>
                </div>
              ))}
              {!preview.length && (
                <div className="px-3 py-4 text-slate-500">Файл не обрано або порожній.</div>
              )}
            </div>
          </div>

          <div className="mt-4 text-xs text-slate-500 leading-relaxed">
            Підказка: достатньо хоча б <code>sku</code> і <code>name</code>. Якщо є <code>category_name</code>,
            а такої категорії ще немає — вона буде створена (опція зверху).
          </div>
        </div>
      </div>
    </div>
  )
}
