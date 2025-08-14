import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import ProductCard from '../components/ProductCard'

export default function CategoryPage() {
  const { id } = useParams()
  const [cat, setCat] = useState(null)
  const [children, setChildren] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')                // ⬅️ пошук

  useEffect(() => {
    if (!id) return
    ;(async () => {
      setLoading(true)
      const [{ data: c }, { data: childs }, { data: prods }] = await Promise.all([
        supabase.from('categories').select('*').eq('id', id).single(),
        supabase.from('categories').select('*').eq('parent_id', id).order('sort_order').order('name'),
        supabase.from('products').select('*').eq('category_id', id).order('created_at', { ascending:false })
      ])
      setCat(c || null)
      setChildren(childs || [])
      setProducts(prods || [])
      setLoading(false)
    })()
  }, [id])

  // локальна фільтрація по назві/опису
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return products
    return products.filter(p =>
      (p.name || '').toLowerCase().includes(t) ||
      (p.description || '').toLowerCase().includes(t)
    )
  }, [products, q])

  return (
    <div className="container-page my-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="h1">{cat?.name || 'Категорія'}</h1>
        <Link to="/" className="btn-outline">← До категорій</Link>
      </div>

      {/* Пошук у межах категорії */}
      <div className="mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l3.387 3.387a1 1 0 01-1.414 1.414l-3.387-3.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" clipRule="evenodd" />
          </svg>
          <input
            className="input pl-9"
            placeholder="Пошук у цій категорії…"
            value={q}
            onChange={e=>setQ(e.target.value)}
          />
        </div>
      </div>

      {/* Підкатегорії (квадратні) */}
      {children.length > 0 && (
        <>
          <div className="text-muted mb-2">Підкатегорії</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 mb-6">
            {children.map(s => (
              <Link key={s.id} to={`/category/${s.id}`} className="card hover:shadow transition">
                <div className="card-body">
                  <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden mb-2">
                    {s.image_url && <img src={s.image_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="font-medium">{s.name}</div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {loading && <div className="text-muted">Завантаження…</div>}
      {!loading && filtered.length === 0 && (
        <div className="text-muted">Нічого не знайдено.</div>
      )}

      {/* Товари: 2 колонки на мобільному */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  )
}
