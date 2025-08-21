// src/components/Footer.jsx
export default function Footer() {
  return (
    <footer className="bg-slate-100 mt-10">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 text-center sm:text-left">
        <div className="grid gap-6 sm:grid-cols-3">
          {/* Логотип / бренд */}
          <div>
            <h2 className="text-lg font-bold">🌐 Dropship Hub</h2>
            <p className="text-sm text-slate-600 mt-1">
              Платформа для дропшиперів та постачальників.
            </p>
          </div>

          {/* Навігація */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Навігація</h3>
            <ul className="space-y-1 text-sm">
              <li><a href="/" className="hover:text-indigo-600">Каталог</a></li>
              <li><a href="/dashboard" className="hover:text-indigo-600">Мої замовлення</a></li>
              <li><a href="/admin/orders" className="hover:text-indigo-600">Адмін панель</a></li>
              <li><a href="/contacts" className="hover:text-indigo-600">Контакти</a></li>
            </ul>
          </div>

          {/* Контакти */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Контакти</h3>
            <p className="text-sm text-slate-600">Email: support@example.com</p>
            <p className="text-sm text-slate-600">Тел: +380 99 123 45 67</p>
            <p className="text-sm text-slate-600">Графік: Пн–Пт 9:00–18:00</p>
          </div>
        </div>

        {/* нижня смужка */}
        <div className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-500 text-center">
          © {new Date().getFullYear()} Dropship Hub. Усі права захищено.
        </div>
      </div>
    </footer>
  )
}
