import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import ProductCard from '../components/ProductCard'
import { stockFirst } from '../utils/sorters'

export default function CategoryPage() {
  const { id } = useParams()
  const [cat, setCat] = useState(null)
  const [children, setChildren] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      setLoading(true)
      const [{ data: c }, { data: childs }, { data: prods }] = await Promise.all([
        supabase.from('categories').select('*').eq('id', id).single(),
        supabase.from('categories').select('*').eq('parent_id', id).order('sort_order').order('name'),
        // ГОЛОВНЕ: спочатку in_stock DESC, далі created_at DESC
        supabase.from('products').select('*').eq('category_id', id)
          .order('in_stock', { ascending: false })
          .order('created_at', { ascending: false })
      ])
      setCat(c || null)
      setChildren(childs || [])
      setProducts(prods || [])
      setLoading(false)
    })()
  }, [id])

  // Додаткова клієнтська підстраховка — в наявності зверху
  const filtered = useMemo(() => products.slice().sort(stockFirst), [products])

  return (
    <div className="container-page my-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="h1">{cat?.name || 'Категорія'}</h1>
        <Link to="/" className="btn-outline">← До категорій</Link>
      </div>

      {/* Підкатегорії (квадратні) */}
      {children.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-5">
            {children.map(child => (
              <Link key={child.id} to={`/category/${child.id}`} className="card overflow-hidden">
                <div className="aspect-square bg-white flex items-center justify-center">
                  <span className="text-sm font-semibold px-2 text-center">{child.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Товари */}
      {loading ? (
        <div className="text-muted">Завантаження…</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  )
}
