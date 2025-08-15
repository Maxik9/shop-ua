
import { Link } from 'react-router-dom'

/**
 * Адмін-панель з доданою карткою "Імпорт товарів".
 * Якщо у тебе вже є свій компонент, просто виріж нижче секцію з цією карткою
 * та встав у свою сітку. Класи розмітки максимально нейтральні (Tailwind).
 */
export default function Admin() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Адмін-панель</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Замовлення */}
        <div className="card">
          <div className="card-body">
            <div className="text-xl font-semibold mb-2">Замовлення</div>
            <div className="text-slate-600 mb-3">Статуси, ТТН, сума до виплати</div>
            <Link to="/admin/orders" className="text-indigo-600 hover:underline">Перейти →</Link>
          </div>
        </div>

        {/* Товари */}
        <div className="card">
          <div className="card-body">
            <div className="text-xl font-semibold mb-2">Товари</div>
            <div className="text-slate-600 mb-3">Додавання, редагування, фото та галереї</div>
            <Link to="/admin/products" className="text-indigo-600 hover:underline">Перейти →</Link>
          </div>
        </div>

        {/* Категорії */}
        <div className="card">
          <div className="card-body">
            <div className="text-xl font-semibold mb-2">Категорії</div>
            <div className="text-slate-600 mb-3">Категорії, підкатегорії та їх зображення</div>
            <Link to="/admin/categories" className="text-indigo-600 hover:underline">Перейти →</Link>
          </div>
        </div>

        {/* НОВЕ: Імпорт товарів */}
        <div className="card">
          <div className="card-body">
            <div className="text-xl font-semibold mb-2">Імпорт товарів</div>
            <div className="text-slate-600 mb-3">
              XLSX (головне фото + галерея через кому), далі XML-фіди
            </div>
            <Link to="/admin/import" className="text-indigo-600 hover:underline">Перейти →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
