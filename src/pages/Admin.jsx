import { Link } from 'react-router-dom'

export default function Admin() {
  return (
    <div className="max-w-6xl mx-auto p-3">
      <div className="flex items-center justify-between gap-3 mb-5">
        <h1 className="text-2xl font-semibold">Адмін-панель</h1>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Tile to="/admin/orders" title="Замовлення" color="indigo"
              desc="Статуси, ТТН, сума до виплати" />
        <Tile to="/admin/products" title="Товари" color="emerald"
              desc="Додавання, редагування, фото та галереї" />
        <Tile to="/admin/categories" title="Категорії" color="amber"
              desc="Категорії, підкатегорії та їх зображення" />
      </div>
    </div>
  )
}

function Tile({ to, title, desc, color }) {
  const bg = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  }[color] || 'bg-slate-50 text-slate-600'

  return (
    <Link to={to} className="group block bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition">
      <div className="flex items-start gap-4">
        <div className={`shrink-0 w-11 h-11 rounded-xl grid place-content-center ${bg}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v12H4V6zm2 2v8h12V8H6z"/></svg>
        </div>
        <div className="min-w-0">
          <div className="text-lg font-medium">{title}</div>
          <div className="text-slate-500 text-sm">{desc}</div>
        </div>
      </div>
      <div className="mt-4 text-slate-600 text-sm group-hover:underline">Перейти →</div>
    </Link>
  )
}
