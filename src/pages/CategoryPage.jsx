// src/pages/CategoryPage.jsx
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import ProductCard from '../components/ProductCard'

export default function CategoryPage() {
  const { id } = useParams()
  const [cat, setCat] = useState(null)
  const [products, setProducts] = useState([])
  const [children, setChildren] = useState([]) // підкатегорії

  useEffect(() => {
    if (!id) return
    ;(async () => {
      const [{ data: c }, { data: childs }, { data: prods }] = await Promise.all([
        supabase.from('categories').select('*').eq('id', id).single(),
        supabase.from('categories').select('*').eq('parent_id', id).order('name'),
        supabase.from('products').select('*').eq('category_id', id).order('created_at', { ascending:false })
      ])
      setCat(c || null)
      setChildren(childs || [])
      setProducts(prods || [])
    })()
  }, [id])

  return (
    <div className="container-page my-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="h1">{cat?.name || 'Категорія'}</h1>
        <Link className="btn-outline" to="/">← До категорій</Link>
      </div>

      {children.length > 0 && (
        <>
          <div className="text-muted mb-2">Підкатегорії</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-6">
            {children.map(s => (
              <Link key={s.id} to={`/category/${s.id}`} className="card hover:shadow transition">
                <div className="card-body">
                  <div className="aspect-[16/10] bg-slate-100 rounded-xl overflow-hidden mb-2">
                    {s.image_url && <img src={s.image_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="font-medium">{s.name}</div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map(p => <ProductCard key={p.id} product={p} />)}
        {products.length === 0 && (
          <div className="text-muted">Немає товарів у цій категорії.</div>
        )}
      </div>
    </div>
  )
}
