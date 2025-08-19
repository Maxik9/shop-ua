// src/pages/AdminImport.jsx
import React, { useMemo, useState } from 'react';
import readXlsxFile from 'read-excel-file';
import { supabase } from '../supabaseClient';

const slugify = (s='') =>
  String(s).toLowerCase()
    .replace(/[\s_]+/g,'-')
    .replace(/[^a-z0-9\-а-яёіїєґ]/gi,'')
    .replace(/-+/g,'-')
    .replace(/^-|-$/g,'');

const toBool = (v) => {
  if (typeof v === 'boolean') return v;
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return ['1','true','так','yes','y','да','дa','в наявності','в наличии','есть'].includes(s);
};

const parsePhotos = (v) => {
  if (!v) return { image_url: null, gallery_json: null };
  const arr = String(v).split(',').map(s => s.trim()).filter(Boolean);
  const image_url = arr.length ? arr[0] : null;
  const gallery_json = arr.length > 1 ? JSON.stringify(arr.slice(1)) : null;
  return { image_url, gallery_json };
};

const pick = (header, names) => {
  for (const n of names) {
    const idx = header.indexOf(n);
    if (idx !== -1) return idx;
  }
  return -1;
};

export default function AdminImport(){
  const [preview, setPreview] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // Для імпорту YML/XML
  const [ymlUrl, setYmlUrl] = useState('');
  const [ymlImportMsg, setYmlImportMsg] = useState('');
  const [ymlImportErr, setYmlImportErr] = useState('');
  const [ymlImportBusy, setYmlImportBusy] = useState(false);

  const onFile = async (e) => {
    setErr(''); setMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setBusy(true);
      const rows = await readXlsxFile(file);
      const header = (rows[0] || []).map(h => String(h || '').trim().toLowerCase());

      const idx = {
        sku: pick(header, ['sku', 'код', 'артикул']),
        name: pick(header, ['name', 'назва', 'название', 'title']),
        price: pick(header, ['price', 'ціна', 'цена']),
        stock: pick(header, ['in_stock','stock','наявність','наличие']),
        description: pick(header, ['description', 'опис', 'описание', 'desc', 'html']),
        photos: pick(header, ['photos', 'images', 'фото', 'зображення']),
        category: pick(header, ['category', 'категорія', 'категория'])
      };

      if (idx.sku === -1 || idx.name === -1) {
        throw new Error('У файлі мають бути колонки "sku" та "name"');
      }

      const items = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || r.length === 0) continue;

        const sku = String(r[idx.sku] ?? '').trim();
        if (!sku) continue;

        const name = String(r[idx.name] ?? '').trim() || `SKU ${sku}`;
        const priceVal = idx.price !== -1 ? r[idx.price] : null;
        const price_dropship = (priceVal === '' || priceVal == null) ? null : Number(priceVal);
        const in_stock = idx.stock !== -1 ? toBool(r[idx.stock]) : false;
        const description = idx.description !== -1 ? (r[idx.description] ?? null) : null;
        const photosRaw = idx.photos !== -1 ? r[idx.photos] : null;
        const categoryName = idx.category !== -1 ? String(r[idx.category] ?? '').trim() : '';

        const { image_url, gallery_json } = parsePhotos(photosRaw);

        items.push({
          sku,
          name,
          price_dropship,
          in_stock,
          description,
          image_url,
          gallery_json,
          _categoryName: categoryName
        });
      }

      setPreview(items);
      setMsg(`Знайдено ${items.length} товарів. Натисни "Імпортувати", щоб зберегти.`);
    } catch (e) {
      console.error(e);
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const ensureCategories = async (names) => {
    const uniq = Array.from(new Set(names.filter(Boolean)));
    if (uniq.length === 0) return {};
    const { data: existing, error: e1 } = await supabase.from('categories').select('id,name');
    if (e1) throw e1;
    const map = new Map((existing || []).map(c => [c.name.trim().toLowerCase(), c.id]));
    const missing = uniq.filter(n => !map.has(n.trim().toLowerCase()));
    if (missing.length) {
      const rows = missing.map(n => ({ name: n, slug: slugify(n) || undefined }));
      const { data: created, error: e2 } = await supabase.from('categories').insert(rows).select('id,name');
      if (e2) throw e2;
      for (const c of created || []) map.set(c.name.trim().toLowerCase(), c.id);
    }
    const dict = {}; for (const n of uniq){ const id = map.get(n.trim().toLowerCase()); if (id) dict[n] = id; }
    return dict;
  };

  const doImport = async () => {
    setErr(''); setMsg('');
    if (!preview.length) { setErr('Спершу завантаж XLSX.'); return; }
    try {
      setBusy(true);
      const dict = await ensureCategories(preview.map(p => p._categoryName).filter(Boolean));

      let done = 0;
      const chunk = 100;
      for (let i = 0; i < preview.length; i += chunk) {
        const part = preview.slice(i, i + chunk).map(p => ({
          sku: p.sku,
          name: p.name,
          price_dropship: p.price_dropship,
          in_stock: p.in_stock,
          description: p.description,
          image_url: p.image_url,
          gallery_json: p.gallery_json,
          category_id: p._categoryName ? (dict[p._categoryName] || null) : null
        }));
        const { error } = await supabase.from('products').upsert(part, { onConflict: 'sku' });
        if (error) throw error;
        done += part.length;
      }
      setMsg(`Готово! Імпортовано/оновлено: ${done} товарів.`);
    } catch (e) {
      console.error(e);
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  // Нова функція для імпорту YML/XML
  const doYmlImport = async () => {
    setYmlImportErr(''); setYmlImportMsg('');
    const url = ymlUrl.trim();
    if (!url) {
      setYmlImportErr('Будь ласка, вкажіть URL.');
      return;
    }
    setYmlImportBusy(true);
    try {
      // Тут вам потрібно буде вставити URL вашої Edge Function, коли ви її розгорнете
      const functionUrl = 'https://supabase.com/dashboard/project/oqfrhvgzwstoxabttqno/functions; // ЗАМІНИТИ НА РЕАЛЬНИЙ URL
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Помилка імпорту');
      }
      setYmlImportMsg(data.message);
    } catch (e) {
      setYmlImportErr(e.message || 'Помилка при запиті до Edge Function');
    } finally {
      setYmlImportBusy(false);
    }
  };

  const columns = useMemo(() => [
    { key: 'sku', label: 'SKU' },
    { key: 'name', label: 'Назва' },
    { key: 'price_dropship', label: 'Ціна' },
    { key: 'in_stock', label: 'Наявність' },
    { key: '_categoryName', label: 'Категорія' },
    { key: 'image_url', label: 'Головне фото' },
  ], []);

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Імпорт товарів</h1>
        <a className="text-blue-600 underline" href="/import_template_fixed.xlsx" download>
          Завантажити шаблон XLSX
        </a>
      </div>

      <div className="card mb-6">
        <div className="card-body space-y-3">
          <p className="font-semibold text-lg mb-2">Імпорт з YML/XML за URL</p>
          <p className="text-sm text-gray-600">
            Вставте посилання на ваш YML/XML-файл. Наявні товари будуть оновлені, нові — додані.
          </p>
          <input
            type="url"
            value={ymlUrl}
            onChange={e => setYmlUrl(e.target.value)}
            className="input w-full"
            placeholder="https://example.com/feed.xml"
            disabled={ymlImportBusy}
          />
          {ymlImportErr && <div className="text-red-600 text-sm mt-1">{ymlImportErr}</div>}
          {ymlImportMsg && <div className="text-green-700 text-sm mt-1">{ymlImportMsg}</div>}
          <div className="flex justify-end">
            <button
              onClick={doYmlImport}
              disabled={ymlImportBusy || !ymlUrl.trim()}
              className="btn-primary"
            >
              {ymlImportBusy ? 'Імпортуємо...' : 'Запустити імпорт'}
            </button>
          </div>
        </div>
      </div>
      
      {/* ІСНУЮЧИЙ БЛОК ІМПОРТУ XLSX */}
      <p className="font-semibold text-lg mb-2 mt-6">Імпорт з XLSX-файлу</p>
      <div className="card mb-6">
        <div className="card-body space-y-3">
          <p className="text-sm text-gray-600">
            Підтримувані колонки: <code>sku</code>, <code>name</code>, <code>price</code>, <code>in_stock</code>, <code>description</code>, <code>photos</code>, <code>category</code>.
            Фото — URL через кому; перша — головна.
          </p>
          <input type="file" accept=".xlsx,.xls" onChange={onFile} className="input w-full" disabled={busy} />
          <div className="flex justify-end">
            <button onClick={doImport} disabled={busy || !preview.length} className="btn-primary">
              Імпортувати
            </button>
          </div>
        </div>
      </div>

      {err && <div className="text-red-600 mb-3">{err}</div>}
      {msg && <div className="text-green-700 mb-3">{msg}</div>}

      {!!preview.length && (
        <div className="card">
          <div className="card-body overflow-auto">
            <table className="table min-w-[900px]">
              <thead>
                <tr>
                  <th>#</th>
                  {columns.map(c => <th key={c.key}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 200).map((p, i) => (
                  <tr key={i} className="border-t">
                    <td>{i+1}</td>
                    {columns.map(c => (
                      <td key={c.key}>
                        {c.key === 'in_stock'
                          ? (p[c.key] ? 'Так' : 'Ні')
                          : (p[c.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 200 && (
              <div className="text-xs text-gray-500 mt-2">
                Показано перші 200 рядків з {preview.length}.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}