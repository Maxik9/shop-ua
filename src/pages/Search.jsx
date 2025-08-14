import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import ProductCard from '../components/ProductCard'

export default function Search() {
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState([])

  const canRun = useMemo(() => (q.trim().length >= 2), [q])

  useEffect(() => {
    if (!canRun) { setProducts([]); return }
    setLoading(true)
    ;(async () => {
      const needle = q.trim()
      const { data } = await supabase
        .from('products')
        .select('*')
        .or(`name.ilike.%${needle}%,description.ilike.%${needle}%`)
        .order('created_at', { ascending: false })
      setProducts(data || [])
      setLoading(false)
    })()
  }, [q, canRun])

  return (
    <div className="container-page my-6">
      <h1 className="h1 mb-3">Пошук</h1>

      <form onSubmit={e=>e.preventDefault()}>
        <div className="relative">
          <input
            className="input input--with-icon"
            placeholder="Пошук по всьому каталогу… (мінімум 2 символи)"
            value={q}
            onChange={e=>setQ(e.target.value)}
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.9 14.32a8 8 0 111.41-1.41l4.39 4.39a1 1 0 01-1.42 1.42l-4.38-4.4zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" clipRule="evenodd" />
          </svg>
        </div>
      </form>

      {loading && <div className="text-muted mt-2">Шукаємо…</div>}
      {!loading && canRun && products.length === 0 && <div className="text-muted mt-2">Нічого не знайдено.</div>}
      {!canRun && <div className="text-muted mt-2">Введіть щонайменше 2 символи.</div>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 mt-3">
        {products.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  )
}
