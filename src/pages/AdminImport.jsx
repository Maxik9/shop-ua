// src/pages/AdminImport.jsx (read-excel-file + multi-images)
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import readXlsxFile from 'read-excel-file'
import { supabase } from '../supabaseClient'

export default function AdminImport() {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const preview = useMemo(() => rows.slice(0, 50), [rows])

  async function handleFile(e) {
    setError(''); setRows([])
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const ext = (file.name.split('.').pop() || '').toLowerCase()
      if (ext === 'csv') {
        const text = await file.text()
        setRows(parseCSV(text))
      } else {
        const matrix = await readXlsxFile(file)
        setRows(parseXLS(matrix))
      }
    } catch (e) { setError(e.message || 'Помилка читання файлу') }
  }

  function parseXLS(matrix) {
    if (!Array.isArray(matrix) || matrix.length === 0) return []
    const header = matrix[0].map(h => String(h || '').trim())
    const idx = Object.fromEntries(header.map((h,i)=>[h,i]))
    const need = ['sku','name','price_dropship']
    for (const c of need) if (!(c in idx)) throw new Error(`Відсутня колонка "${c}"`)

    const out = []
    for (let r=1;r<matrix.length;r++) {
      const row = matrix[r]
      const rec = baseRecord({
        sku: row[idx.sku], name: row[idx.name], description: row[idx.description],
        price_dropship: row[idx.price_dropship], category_id: idx.category_id!=null? row[idx.category_id] : null,
        image_url: row[idx.image_url], images: idx.images!=null? row[idx.images] : null,
        otherImages: Array.from({length:10}, (_,i)=> idx['image'+(i+1)]!=null ? row[idx['image'+(i+1)]] : null)
      })
      if (rec.sku && rec.name) out.push(rec)
    }
    return out
  }

  function parseCSV(text) {
    const lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').filter(Boolean)
    if (lines.length===0) return []
    const header = splitCSVLine(lines[0]).map(s=>s.trim())
    const idx = Object.fromEntries(header.map((h,i)=>[h,i]))
    const need = ['sku','name','price_dropship']
    for (const c of need) if (!(c in idx)) throw new Error(`Відсутня колонка "${c}"`)

    const out = []
    for (let i=1;i<lines.length;i++) {
      const cols = splitCSVLine(lines[i])
      const rec = baseRecord({
        sku: cols[idx.sku], name: cols[idx.name], description: idx.description!=null? cols[idx.description]: '',
        price_dropship: idx.price_dropship!=null? cols[idx.price_dropship]: 0,
        category_id: idx.category_id!=null? cols[idx.category_id]: null,
        image_url: idx.image_url!=null? cols[idx.image_url]: '',
        images: idx.images!=null? cols[idx.images]: '',
        otherImages: Array.from({length:10}, (_,k)=> idx['image'+(k+1)]!=null? cols[idx['image'+(k+1)]]: null)
      })
      if (rec.sku && rec.name) out.push(rec)
    }
    return out
  }

  function baseRecord({sku, name, description, price_dropship, category_id, image_url, images, otherImages}) {
    let gallery = []
    const add = (v)=>{ const s=String(v||'').trim(); if(s) gallery.push(s) }
    // images: строка з URL, розділена комою/пробілом/|/;
    if (images) String(images).split(/[\s,;|]+/).forEach(add)
    if (image_url) add(image_url)
    if (Array.isArray(otherImages)) otherImages.forEach(add)
    gallery = Array.from(new Set(gallery)) // унікальні
    const main = gallery[0] || ''
    return {
      sku: String(sku||'').trim(),
      name: String(name||'').trim(),
      description: String(description||'').trim(),
      price_dropship: Number(price_dropship||0) || 0,
      category_id: category_id===''||category_id==null ? null : Number(category_id),
      image_url: main,
      gallery_json: gallery,
      active: true,
    }
  }

  function splitCSVLine(line){ const out=[]; let cur=''; let q=false; for(let i=0;i<line.length;i++){const ch=line[i]; if(ch==='"'){ if(q&&line[i+1]==='"'){cur+='"'; i++} else {q=!q} } else if(ch===','&&!q){ out.push(cur); cur=''} else cur+=ch } out.push(cur); return out }

  async function runImport() {
    if (rows.length===0) return
    setUploading(true); setError('')
    try {
      const chunk = 300
      for (let i=0;i<rows.length;i+=chunk){
        const part = rows.slice(i,i+chunk)
        const { error } = await supabase.from('products').upsert(part, { onConflict: 'sku' })
        if (error) throw error
      }
      alert('Імпортовано: '+rows.length+' записів ✅')
    } catch (e) { setError(e.message || 'Помилка імпорту') }
    finally { setUploading(false) }
  }

  return (
    <div className="container-page my-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="h1">Імпорт товарів (XLSX/CSV)</h1>
        <Link className="btn-outline" to="/admin/products">← До товарів</Link>
      </div>

      <div className="card mb-4">
        <div className="card-body space-y-3">
          <div className="text-sm text-muted">Перший рядок — заголовок. Підтримуються колонки: <code>sku, name, description, price_dropship, category_id, image_url, images, image1..image10</code>. Перше фото стає головним.</div>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button className="btn-primary" onClick={runImport} disabled={rows.length===0 || uploading}>{uploading ? 'Імпортую…' : `Імпортувати ${rows.length} записів`}</button>
        </div>
      </div>

      {rows.length>0 && (
        <div className="card">
          <div className="card-body">
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted"><tr><th className="pr-3">sku</th><th className="pr-3">name</th><th className="pr-3">price</th><th className="pr-3">#photos</th></tr></thead>
                <tbody>{preview.map((r,i)=>(<tr key={i}><td className="pr-3 font-mono">{r.sku}</td><td className="pr-3">{r.name}</td><td className="pr-3">{r.price_dropship}</td><td className="pr-3">{(r.gallery_json||[]).length}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
