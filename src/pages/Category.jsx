import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { stockFirst } from '../utils/sorters'

// Drop-in category page that ensures: products IN STOCK appear first.
// It tries to resolve category by slug or id.
export default function Category() {
  const { slug, id } = useParams()
  const [cat, setCat] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    ;(async () => {
      setLoading(true); setErr('')
      // 1) Resolve category
      let catRow = null
      if (slug) {
        const { data } = await supabase.from('categories').select('*').eq('slug', slug).maybeSingle()
        catRow = data || null
      }
      if (!catRow && id) {
        const { data } = await supabase.from('categories').select('*').eq('id', id).maybeSingle()
        catRow = data || null
      }
      setCat(catRow)

      // 2) Get products for category
      if (catRow) {
        // Order by in_stock desc (true first), then by id desc
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('category_id', catRow.id)
          .order('in_stock', { ascending: false })
          .order('id', { ascending: false })
          .limit(1000)

        // Fallback client sort just in case
        const arr = (error ? [] : (data || [])).slice().sort(stockFirst)
        setItems(arr)
      } else {
        setItems([])
      }
      setLoading(false)
    })()
  }, [slug, id])

  if (loading) return <div className="container mx-auto p-4">Завантаження…</div>
  if (err) return <div className="container mx-auto p-4 text-red-600">Помилка: {err}</div>

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">{cat?.name || 'Категорія'}</h1>
      {items.length === 0 ? (
        <div className="text-muted">Нічого не знайдено.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map(p => (
            <a key={p.id} href={`/product/${p.id}`} className="card hover:shadow-md transition">
              <div className="card-body">
                <div className="w-full aspect-square bg-slate-100 rounded overflow-hidden flex items-center justify-center mb-2">
                  {p.image_url ? <img src={p.image_url} alt={p.name} className="object-cover w-full h-full" /> : <span className="text-xs text-slate-400">без фото</span>}
                </div>
                <div className="font-medium line-clamp-2 min-h-[2.5rem]">{p.name}</div>
                <div className="flex items-center justify-between mt-1">
                  <div className="font-semibold">{(p.price_dropship ?? p.price ?? 0)} ₴</div>
                  <div className={`text-xs ${p.in_stock ? 'text-green-600' : 'text-slate-500'}`}>{p.in_stock ? 'в наявності' : 'немає'}</div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
