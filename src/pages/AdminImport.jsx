// src/pages/AdminImport.jsx (read-excel-file, no known high vuln)
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import readXlsxFile from 'read-excel-file'
import { supabase } from '../supabaseClient'

/**
 * Підтримка: .xlsx/.xls (через read-excel-file) і .csv як запасний варіант.
 * Перший рядок — заголовок з назвами колонок:
 * sku, name, description, price_dropship, category_id, image_url, active
 * upsert по sku
 */
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
        // XLSX / XLS
        const rows = await readXlsxFile(file, { dateFormat: 'yyyy-mm-dd' })
        setRows(parseXLS(rows))
      }
    } catch (e) {
      setError(e.message || 'Помилка читання файлу')
    }
  }

  function parseXLS(matrix) {
    if (!Array.isArray(matrix) || matrix.length === 0) return []
    const header = matrix[0].map(h => String(h || '').trim())
    const required = ['sku','name','price_dropship']
    for (const col of required) {
      if (!header.includes(col)) throw new Error(`Відсутня колонка "${col}"`)
    }
    const idx = Object.fromEntries(header.map((h,i)=>[h,i]))
    const list = []
    for (let i=1;i<matrix.length;i++) {
      const cols = matrix[i]
      if (!cols || cols.length===0) continue
      const rec = {
        sku: String(cols[idx.sku] ?? '').trim(),
        name: String(cols[idx.name] ?? '').trim(),
        description: String(cols[idx.description] ?? '').trim(),
        price_dropship: Number(cols[idx.price_dropship] ?? 0) || 0,
        category_id: (idx.category_id!=null ? (cols[idx.category_id] === '' ? null : Number(cols[idx.category_id])) : null),
        image_url: String(cols[idx.image_url] ?? '').trim(),
        active: String(cols[idx.active] ?? 'true').toLowerCase() === 'true',
      }
      if (!rec.sku || !rec.name) continue
      list.push(rec)
    }
    return list
  }

  function parseCSV(text) {
    const lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').filter(l=>l.trim().length>0)
    if (lines.length===0) return []
    const header = splitCSVLine(lines[0]).map(h=>h.trim())
    const required = ['sku','name','price_dropship']
    for (const col of required) if (!header.includes(col)) throw new Error(`Відсутня колонка "${col}"`)
    const idx = Object.fromEntries(header.map((h,i)=>[h,i]))
    const list = []
    for (let i=1;i<lines.length;i++) {
      const cols = splitCSVLine(lines[i])
      if (cols.length===1 && cols[0].trim()==='') continue
      const rec = {
        sku: (cols[idx.sku]||'').trim(),
        name: (cols[idx.name]||'').trim(),
        description: (idx.description!=null ? (cols[idx.description]||'').trim() : ''),
        price_dropship: Number(idx.price_dropship!=null ? cols[idx.price_dropship] : 0) || 0,
        category_id: (idx.category_id!=null ? (cols[idx.category_id]===''?null:Number(cols[idx.category_id]||0)) : null),
        image_url: (idx.image_url!=null ? (cols[idx.image_url]||'').trim() : ''),
        active: (idx.active!=null ? String(cols[idx.active]||'true').toLowerCase()==='true' : true),
      }
      if (!rec.sku || !rec.name) continue
      list.push(rec)
    }
    return list
  }

  function splitCSVLine(line) {
    const out = []; let cur=''; let inQ=false
    for (let i=0;i<line.length;i++){
      const ch=line[i]
      if (ch==='"'){ if(inQ && line[i+1]==='"'){cur+='"'; i++} else {inQ=!inQ} }
      else if (ch===',' && !inQ){ out.push(cur); cur='' }
      else cur+=ch
    }
    out.push(cur); return out
  }

  async function runImport() {
    if (rows.length===0) return
    setUploading(true); setError('')
    try {
      const chunkSize = 300
      for (let i=0;i<rows.length;i+=chunkSize){
        const chunk = rows.slice(i,i+chunkSize)
        const { error } = await supabase.from('products').upsert(chunk, { onConflict: 'sku' })
        if (error) throw error
      }
      alert('Імпортовано: ' + rows.length + ' записів ✅')
    } catch (e) {
      setError(e.message || 'Помилка імпорту')
    } finally {
      setUploading(false)
    }
  }

  function downloadTemplateCSV() {
    const tpl = [
      'sku,name,description,price_dropship,category_id,image_url,active',
      'ABC-001,Приклад товару,Короткий опис,299.99,1,https://example.com/img.jpg,true'
    ].join('\n')
    const blob = new Blob([tpl], { type:'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download='products_template.csv'
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  }

  return (
    <div className="container-page my-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="h1">Імпорт товарів (XLSX/CSV)</h1>
        <Link className="btn-outline" to="/admin/products">← До товарів</Link>
      </div>

      <div className="card mb-4">
        <div className="card-body space-y-3">
          <div className="text-sm text-muted">
            Підтримка файлів .xlsx/.xls або .csv. Перший рядок — заголовок: <code>sku, name, description, price_dropship, category_id, image_url, active</code>. Унікальний ключ — <code>sku</code>.
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
            <button className="btn-outline" onClick={downloadTemplateCSV}>Шаблон CSV</button>
            <button className="btn-primary" onClick={runImport} disabled={rows.length===0 || uploading}>
              {uploading ? 'Імпортую…' : `Імпортувати ${rows.length} записів`}
            </button>
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
        </div>
      </div>

      {rows.length>0 && (
        <div className="card">
          <div className="card-body">
            <div className="text-sm text-muted mb-2">Попередній перегляд (перші 50 рядків):</div>
            <div className="overflow-auto">
              <table className="w-full text-sm border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-muted">
                    <th className="pr-3">sku</th>
                    <th className="pr-3">name</th>
                    <th className="pr-3">price_dropship</th>
                    <th className="pr-3">category_id</th>
                    <th className="pr-3">image_url</th>
                    <th className="pr-3">active</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r,i)=>(
                    <tr key={i}>
                      <td className="pr-3 font-mono">{r.sku}</td>
                      <td className="pr-3">{r.name}</td>
                      <td className="pr-3">{r.price_dropship}</td>
                      <td className="pr-3">{r.category_id ?? ''}</td>
                      <td className="pr-3 truncate max-w-[280px]">{r.image_url ?? ''}</td>
                      <td className="pr-3">{r.active ? 'true' : 'false'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
