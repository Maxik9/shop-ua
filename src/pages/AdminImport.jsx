
import { useRef, useState } from 'react'
import readXlsxFile from 'read-excel-file'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

/**
 * AdminImport — крок 1: XLSX імпорт товарів
 * Поля: sku*, name, price, in_stock, description, photos (кома-розділений список URL)
 * Галерея: перший URL = головне фото (image_url), вся послідовність = gallery_json
 * Upsert у public.products за ключем sku.
 * (крок 2: XML-фіди додамо у цю ж сторінку окремою вкладкою)
 */

const XLSX_FIELDS = [
  { key: 'sku',         label: 'Артикул (SKU)', required: true },
  { key: 'name',        label: 'Назва' },
  { key: 'price',       label: 'Ціна' },
  { key: 'in_stock',    label: 'Наявність (1/0, так/ні)' },
  { key: 'description', label: 'Опис (HTML або текст)' },
  { key: 'photos',      label: 'Фото (URL через кому)', hint: 'перший = головне, решта = галерея' },
]

function normBool(v){
  if (typeof v === 'boolean') return v
  const s = String(v ?? '').trim().toLowerCase()
  if (!s) return false
  if (!isNaN(+s)) return (+s) > 0
  return ['yes','true','y','так','да','в наявності','есть','наличие','in stock','true'].some(w => s.includes(w))
}
function normPrice(v){
  if (v == null) return 0
  const s = String(v).replace(',', '.').replace(/[^\d.]/g,'')
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}
function splitPhotos(v){
  if (!v && v !== 0) return []
  // підтримує кому, крапку з комою або вертикальну риску
  return String(v).split(/[;,|]/).map(s => s.trim()).filter(Boolean)
}

export default function AdminImport(){
  const [tab, setTab] = useState('xlsx') // 'xlsx' | 'xml' (пізніше)
  const fileRef = useRef(null)

  const [headers, setHeaders] = useState([])  // назви колонок
  const [rows, setRows] = useState([])        // масив рядків (масив масивів)
  const [map, setMap] = useState({})          // відповідність поле -> назва колонки
  const [preview, setPreview] = useState([])  // перші N нормалізованих рядків
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function onFile(e){
    const file = e.target.files?.[0]
    if (!file) return
    setErr(''); setMsg('')
    try{
      const data = await readXlsxFile(file)
      if (!data?.length) throw new Error('Порожній файл або невірний формат')
      const [hdr, ...rest] = data
      const hdrs = hdr.map(h => String(h ?? '').trim())
      setHeaders(hdrs); setRows(rest)

      // Автовгадування заголовків за синонімами
      const lower = hdrs.map(h => h.toLowerCase())
      const find = (...keys) => { for (const k of keys){ const i = lower.indexOf(k); if (i>=0) return hdrs[i] } return '' }
      const guess = {
        sku:         find('sku','артикул','код','код/артикул'),
        name:        find('name','назва','наименование','товар'),
        price:       find('price','ціна','цена'),
        in_stock:    find('in_stock','stock','наявність','наличие','остаток'),
        description: find('description','опис','описание','html'),
        photos:      find('photos','images','gallery','gallery_urls','фото','галерея'),
      }
      setMap(guess)
      recomputePreview(guess, rest, hdrs)
    }catch(e){
      setErr(e.message || 'Помилка читання XLSX')
    }finally{
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function recomputePreview(mapping, dataRows, hdrs){
    const colIndex = Object.fromEntries(hdrs.map((h,i)=>[h,i]))
    const pv = dataRows.slice(0, 30).map(r => {
      const o = {}
      for (const f of XLSX_FIELDS){
        const col = mapping[f.key]
        if (!col) continue
        const i = colIndex[col]
        let v = r[i]
        if (f.key === 'in_stock') v = normBool(v)
        if (f.key === 'price') v = normPrice(v)
        if (f.key === 'photos') v = splitPhotos(v)
        o[f.key] = v
      }
      // зручні поля для прев'ю
      o._main = Array.isArray(o.photos) && o.photos.length ? o.photos[0] : ''
      o._count = Array.isArray(o.photos) ? o.photos.length : 0
      return o
    })
    setPreview(pv)
  }

  function MappingSelect({ field }){
    return (
      <select
        className="input"
        value={map[field] || ''}
        onChange={(e)=>{
          const m = { ...map, [field]: e.target.value }
          setMap(m)
          recomputePreview(m, rows, headers)
        }}
      >
        <option value="">— не мапити —</option>
        {headers.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
    )
  }

  async function runImport(){
    setBusy(true); setMsg(''); setErr('')
    try{
      if (!map.sku) throw new Error('Вкажіть колонку для SKU (артикул)')
      const colIndex = Object.fromEntries(headers.map((h,i)=>[h,i]))
      // 1) збираємо об’єкти з таблиці
      const all = rows.map(r => {
        const o = {}
        for (const f of XLSX_FIELDS){
          const col = map[f.key]
          if (!col) continue
          const i = colIndex[col]
          let v = r[i]
          if (f.key === 'in_stock') v = normBool(v)
          if (f.key === 'price') v = normPrice(v)
          if (f.key === 'photos') v = splitPhotos(v)
          o[f.key] = v
        }
        return o
      }).filter(o => o.sku)

      if (!all.length) throw new Error('Не знайдено жодного рядка з SKU')

      // 2) трансформація під products
      const toUpsert = all.map(o => {
        const photos = Array.isArray(o.photos) ? o.photos : []
        return {
          sku: String(o.sku).trim(),
          name: o.name ? String(o.name).trim() : null,
          price_dropship: typeof o.price === 'number' ? o.price : null,
          in_stock: !!o.in_stock,
          description: o.description ?? null,
          image_url: photos[0] || null,          // перше фото — головне
          gallery_json: photos.length ? photos : null, // вся галерея
        }
      })

      // 3) батчовий upsert по sku
      const CHUNK = 200
      let done = 0
      for (let i=0; i<toUpsert.length; i+=CHUNK){
        const slice = toUpsert.slice(i, i+CHUNK)
        const { error } = await supabase.from('products').upsert(slice, { onConflict: 'sku' })
        if (error) throw error
        done += slice.length
      }
      setMsg(`Готово: імпортовано/оновлено ${done} позицій`)
    }catch(e){
      setErr(e.message || 'Помилка імпорту')
    }finally{
      setBusy(false)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Імпорт товарів</h1>
        <Link to="/admin/products" className="btn-ghost">← До товарів</Link>
      </div>

      <div className="mb-3 flex gap-2">
        <button className={`btn-outline ${'xlsx'==='xlsx'?'!bg-slate-200':''}`}>XLSX</button>
        <button className="btn-outline opacity-60 pointer-events-none" title="Скоро">XML фіди (скоро)</button>
      </div>

      {err && <div className="text-sm text-red-600 mb-3">Помилка: {err}</div>}
      {msg && <div className="text-sm text-green-700 mb-3">{msg}</div>}

      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={onFile} />
            <div className="text-sm text-slate-600">
              Підтримувані поля (будь-який порядок): <b>sku*</b>, name, price, in_stock, description, photos(<i>URL через кому</i>).
            </div>
          </div>

          {headers.length > 0 && (
            <>
              <h3 className="mt-4 font-semibold">Мапінг полів</h3>
              <div className="grid md:grid-cols-2 gap-3 mt-2">
                {XLSX_FIELDS.map(f => (
                  <label key={f.key} className="flex items-center gap-2">
                    <div className="w-64 text-sm">
                      {f.label}{f.required ? ' *' : ''}{f.hint ? <span className="block text-xs text-slate-500">{f.hint}</span> : null}
                    </div>
                    <MappingSelect field={f.key} />
                  </label>
                ))}
              </div>

              <h3 className="mt-4 font-semibold">Превʼю (перші 30)</h3>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      {XLSX_FIELDS.map(f => <th key={f.key}>{f.label}</th>)}
                      <th>Головне фото</th>
                      <th>Фото (к-сть)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i}>
                        {XLSX_FIELDS.map(f => <td key={f.key}>
                          <span className="text-xs">
                            {Array.isArray(r[f.key]) ? r[f.key].join(', ') : String(r[f.key] ?? '')}
                          </span>
                        </td>)}
                        <td><span className="text-xs">{r._main || ''}</span></td>
                        <td><span className="text-xs">{r._count || 0}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3">
                <button className="btn-primary" disabled={busy} onClick={runImport}>
                  {busy ? 'Імпорт…' : 'Імпортувати / оновити'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
