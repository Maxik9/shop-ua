// src/pages/Catalog.jsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import ProductCard from '../components/ProductCard'

export default function Catalog() {
  const [categories, setCategories] = useState([])
  const [selected, setSelected]   = useState('all')

  // поиск
  const [q, setQ]                 = useState('')      // то, что в инпуте
  const [term, setTerm]           = useState('')      // «дебаунс»-значение

  // данные
  const [products, setProducts]   = useState([])
  const [loading, setLoading]     = useState(false)

  /* загрузка категорий один раз */
  useEffect(() => { (async () => {
    const { data } = await supabase.from('categories').select('*').order('name', { ascending: true })
    setCategories(data || [])
  })()}, [])

  /* дебаунс строки поиска (300мс) */
  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])

  /* подгрузка товаров при смене категории/поиска */
  useEffect(() => { loadProducts() }, [selected, term])

  async function loadProducts() {
    setLoading(true)
    let query = supabase.from('products').select('*').order('created_at', { ascending: false })

    if (selected !== 'all') query = query.eq('category_id', selected)

    // поиск по name и description (ILIKE)
    if (term) {
      // экранируем проценты/подчеркивание
      const s = term.replace(/[%_]/g, ch => '\\' + ch)
      query = query.or(`name.ilike.%${s}%,description.ilike.%${s}%`)
    }

    const { data, error } = await query
    if (!error) setProducts(data || [])
    setLoading(false)
  }

  function btn(active){
    return `px-3 h-9 rounded-full border text-sm
      ${active ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white hover:bg-slate-50'}`
  }

  return (
    <div className="max-w-6xl mx-auto px-3 py-6">
      {/* Поиск + фильтры */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        {/* поле поиска */}
        <div className="w-full sm:max-w-md">
          <div className="relative">
            <input
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              placeholder="Пошук товарів…"
              className="input pl-10 w-full"
            />
            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
            </svg>
            {q && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
                onClick={()=>setQ('')}
                title="Очистити"
              >
                ×
              </button>
            )}
          </div>
          {term && (
            <div className="text-xs text-muted mt-1">Пошук: “{term}”</div>
          )}
        </div>

        {/* кнопки категорий */}
        <div className="flex flex-wrap gap-2">
          <button onClick={()=>setSelected('all')} className={btn(selected==='all')}>Усі</button>
          {categories.map(c => (
            <button key={c.id} onClick={()=>setSelected(c.id)} className={btn(selected===c.id)}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* результаты */}
      {loading && <div className="text-muted">Завантаження…</div>}
      {!loading && products.length===0 && (
        <div className="text-muted">Нічого не знайдено.</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {products.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  )
}
