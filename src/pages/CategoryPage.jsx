import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import ProductCard from '../components/ProductCard'

export default function CategoryPage() {
  const { id } = useParams()
  const [cat, setCat] = useState(null)
  const [children, setChildren] = useState([])
  const [products, setProducts] = useState([])
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!id) return
    ;(async () => {
      const [{ data: c }, { data: kids }] = await Promise.all([
        supabase.from('categories').select('*').eq('id', id).single(),
        supabase.from('categories').select('*').eq('parent_id', id).order('name')
      ])
      setCat(c || null)
      setChildren(kids || [])

      // продукти поточної категорії + підкатегорій
      const subIds = (kids || []).map(x => x.id)
      const ids = [id, ...subIds]
      const { data: prods } = await supabase
        .from('products')
        .select('*')
        .in('category_id', ids)
        .order('created_at', { ascending: false })
      setProducts(prods || [])
    })()
  }, [id])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return products
    return (products || []).filter(p => (p.name || '').toLowerCase().includes(t))
  }, [q, products])

  return (
    <div className="max-w-6xl mx-auto p-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{cat?.name || 'Категорія'}</h1>
        <Link to="/" className="btn-outline">Усі категорії</Link>
      </div>

      {/* підкатегорії */}
      {children.length>0 && (
        <div className="mt-4">
          <div className="text-sm text-slate-500 mb-2">Підкатегорії</div>
          <div className="grid xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {children.map(c => (
              <Link key={c.id} to={`/category/${c.id}`} className="block bg-white rounded-xl border border-slate-200 hover:shadow-sm transition">
                <div className="aspect-[4/3] rounded-t-xl overflow-hidden bg-slate-100">
                  {c.image_url && <img src={c.image_url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="p-3 font-medium">{c.name}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* пошук */}
      <div className="mt-6 mb-3">
        <input className="input w-full" placeholder="Пошук товарів…" value={q} onChange={e=>setQ(e.target.value)} />
      </div>

      {/* товари */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => <ProductCard key={p.id} product={p} />)}
        {filtered.length===0 && (
          <div className="text-slate-500">Немає товарів за запитом.</div>
        )}
      </div>
    </div>
  )
}
