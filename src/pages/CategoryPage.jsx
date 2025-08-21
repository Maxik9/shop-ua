import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function CategoryPage() {
  const { key } = useParams();
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = searchParams.get('sort') || 'alpha';

  const [subcats, setSubcats] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('slug', key)
        .limit(1);

      const cat = cats?.[0];
      if (!cat) { setSubcats([]); setProducts([]); setLoading(false); return; }

      const { data: subs } = await supabase.rpc('get_subcategories_with_counts', { p_parent: cat.id });
      setSubcats(subs || []);

      const { data: prods } = await supabase.rpc('get_category_products', {
        p_category: cat.id, p_sort: sort, p_limit: 1000, p_offset: 0
      });
      setProducts(prods || []);
      setLoading(false);
    })();
  }, [key, sort]);

  const onChangeSort = (e) => {
    const next = e.target.value;
    const params = new URLSearchParams(searchParams);
    params.set('sort', next);
    setSearchParams(params, { replace: false }); // додаємо запис у історію
  };

  const goBack = () => {
    if (window.history.length > 1) nav(-1);
    else nav('/');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={goBack} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">← Назад</button>
        <div className="flex items-center gap-3">
          <span>Сортувати товари:</span>
          <select value={sort} onChange={onChangeSort} className="px-3 py-2 rounded-lg border">
            <option value="alpha">За алфавітом</option>
            <option value="price_asc">Ціна: за зростанням</option>
            <option value="price_desc">Ціна: за спаданням</option>
            <option value="popular">Популярні</option>
          </select>
        </div>
      </div>

      {loading ? <p>Завантаження…</p> : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map(p => (
            <a key={p.id} href={`/product/${p.id}`} className="block rounded-2xl border p-4 hover:shadow">
              <img src={p.image_url} alt={p.name} className="w-full h-56 object-cover rounded-xl mb-3" />
              <div className="font-medium line-clamp-2">{p.name}</div>
              <div className="mt-1 opacity-60">Дроп-ціна: {Number(p.price_dropship).toFixed(2)} ₴</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
