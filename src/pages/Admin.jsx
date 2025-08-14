// src/pages/Admin.jsx  (дашборд)
import { Link } from 'react-router-dom'

export default function Admin() {
  return (
    <div className="container-page my-6">
      <h1 className="h1 mb-4">Адмін-панель</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/admin/orders" className="card hover:shadow transition">
          <div className="card-body">
            <div className="text-xl font-semibold mb-1">Замовлення</div>
            <div className="text-muted">Статуси, ТТН, сума до виплати</div>
            <div className="mt-2 text-indigo-600">Перейти →</div>
          </div>
        </Link>

        <Link to="/admin/products" className="card hover:shadow transition">
          <div className="card-body">
            <div className="text-xl font-semibold mb-1">Товари</div>
            <div className="text-muted">Додавання, редагування, фото та галереї</div>
            <div className="mt-2 text-indigo-600">Перейти →</div>
          </div>
        </Link>

        <Link to="/admin/categories" className="card hover:shadow transition">
          <div className="card-body">
            <div className="text-xl font-semibold mb-1">Категорії</div>
            <div className="text-muted">Категорії, підкатегорії та їх зображення</div>
            <div className="mt-2 text-indigo-600">Перейти →</div>
          </div>
        </Link>

        <Link to="/admin/html-editor" className="card hover:shadow transition">
          <div className="card-body">
            <div className="text-xl font-semibold mb-1">HTML-редактор описів</div>
            <div className="text-muted">Редагуйте HTML-опис товарів з превʼю</div>
            <div className="mt-2 text-indigo-600">Перейти →</div>
          </div>
        </Link>
      </div>
    </div>
  )
}
