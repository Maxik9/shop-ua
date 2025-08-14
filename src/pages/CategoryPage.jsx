// src/pages/CategoryPage.jsx
import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import ProductCard from '../components/ProductCard'

export default function CategoryPage() {
  const { slug } = useParams()
  const [cat, setCat] = useState(null)
  const [subs, setSubs] = useState([])
  const [products, setProducts] = useState([])
  const [q, setQ] = useState('')
  const nav = useNavigate()

  useEffect(() => {
    load()
  }, [slug])

  async function load() {
    // поточна категорія
    const { data: c } = await supabase.from('categories').select('*').eq('slug', slug).single()
    setCat(c || null)
    if (!c) return

    // підкатегорії
    const { data: subcats } = await supabase
      .from('categories')
      .select('*')
      .eq('parent_id', c.id)
      .order('sort_order', { ascending: true })
    setSubs(subcats || [])

    // товари цієї категорії
    const { data: prods } = await supabase
      .from('products')
      .select('*')
      .eq('category_id', c.id)
      .order('created_at', { ascending: false })
    setProducts(prods || [])
  }

  function doSearch(e){
    e.preventDefault()
    const query = q.trim()
    if (!query) return
    nav(`/search?q=${encodeURIComponent(query)}`)
  }

  if (!cat) {
    return <div className="max-w-6xl mx-auto px-3 py-6">Завантаження…</div>
  }

  return (
    <div className="max-w-6xl mx-auto px-3 py-6">
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <Link to="/categories" className="hover:text-indigo-600">Категорії</Link>
        <span>›</span>
        <span className="text-slate-900">{cat.name}</span>
      </div>

      <form onSubmit={doSearch} className="relative mb-6">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input
          value={q}
          onChange={(e)=>setQ(e.target.value)}
          placeholder={`Пошук…`}
          className="w-full h-12 rounded-2xl border border-slate-200 pl-11 pr-4 outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </form>

      {subs.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-3">Підкатегорії</h2>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 mb-6">
            {subs.map(s => (
              <Link key={s.id} to={`/c/${s.slug}`}
                className="group rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-md transition">
                <div className="aspect-[4/3] bg-slate-100">
                  {s.image_url && <img src={s.image_url} alt={s.name} className="w-full h-full object-cover" />}
                </div>
                <div className="p-3">
                  <div className="font-medium group-hover:text-indigo-600">{s.name}</div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <h2 className="text-lg font-semibold mb-3">Товари</h2>
      {products.length === 0 ? (
        <div className="text-slate-500">Немає товарів у цій категорії.</div>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
          {products.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  )
}
