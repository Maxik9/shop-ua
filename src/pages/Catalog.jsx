// src/pages/Catalog.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import ProductCard from '../components/ProductCard'

export default function Catalog() {
  const [categories, setCategories] = useState([])
  const [selected, setSelected] = useState('all')

  // пошук
  const [q, setQ] = useState('')      // те, що у полі вводу
  const [term, setTerm] = useState('')// дебаунс-значення

  // дані
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)

  /* 1) завантаження категорій */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('categories_nonempty_full').select('*').order('sort_order', { ascending: true }).order('name', { ascending: true })
      setCategories(data || [])
    })()
  }, [])

  /* 2) дебаунс пошуку */
  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])

  /* 3) підвантаження товарів при зміні фільтрів/пошуку */
  useEffect(() => {
    loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, term])

  async function loadProducts() {
    setLoading(true)
    let query = supabase.from('products').select('*').order('created_at', { ascending: false })

    if (selected !== 'all') {
      query = query.eq('category_id', selected)
    }

    // пошук по name/description (ILIKE)
    if (term) {
      // екрануємо спецсимволи для ILIKE
      const s = term.replace(/[%_]/g, (ch) => '\\' + ch)
      query = query.or(`name.ilike.%${s}%,description.ilike.%${s}%`)
    }

    const { data, error } = await query
    if (!error) setProducts(data || [])
    setLoading(false)
  }

  /* невеликий helper для стилів кнопок категорій */
  function catBtn(active) {
    return [
      'px-3 h-9 rounded-full border text-sm',
      active
        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
        : 'border-slate-200 bg-white hover:bg-slate-50'
    ].join(' ')
  }

  return (
    <div className="max-w-6xl mx-auto px-3 py-6">
      {/* Пошук + категорії */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        {/* Пошук (виправлений) */}
        <div className="relative w-full sm:max-w-md">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Пошук товарів…"
            className="w-full h-12 pl-11 pr-10 rounded-xl border border-slate-300 bg-white
                       text-[15px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {/* лупа */}
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
            fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
          </svg>
          {/* хрестик очистити */}
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center
                         rounded-full text-slate-400 hover:text-slate-600"
              aria-label="Очистити пошук"
              title="Очистити"
            >
              <span className="-mt-[1px] text-lg leading-none">×</span>
            </button>
          )}
          {term && <div className="text-xs text-slate-500 mt-1">Пошук: “{term}”</div>}
        </div>

        {/* Категорії */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSelected('all')} className={catBtn(selected === 'all')}>Усі</button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={catBtn(selected === c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Результати */}
      {loading && <div className="text-slate-500">Завантаження…</div>}
      {!loading && products.length === 0 && (
        <div className="text-slate-500">Нічого не знайдено.</div>
      )}

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
  {products.map((p) => (
    <ProductCard key={p.id} product={p} />
  ))}
</div>
    </div>
  )
}
