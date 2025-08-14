// src/pages/Search.jsx
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import ProductCard from '../components/ProductCard'

export default function Search() {
  const [params] = useSearchParams()
  const term = (params.get('q') || '').trim()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!term) { setProducts([]); return }
    setLoading(true)
    supabase
      .from('products')
      .select('*')
      .or(`name.ilike.%${term}%,description.ilike.%${term}%`)
      .order('created_at', { ascending: false })
      .then(({ data }) => setProducts(data || []))
      .finally(() => setLoading(false))
  }, [term])

  return (
    <div className="max-w-6xl mx-auto px-3 py-6">
      <h1 className="text-xl font-semibold mb-4">Пошук: “{term || '…'}”</h1>
      {loading ? <div>Завантаження…</div> : (
        products.length ? (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <div className="text-slate-500">Нічого не знайдено.</div>
        )
      )}
    </div>
  )
}
