// src/pages/Contacts.jsx
import React from 'react'
import { Link } from 'react-router-dom'

export default function Contacts() {
  const EMAIL   = 'mdshop784@gmail.com'
  const PHONE   = '+380 99 123 45 67'
  const TELEBOT = 'https://t.me/DreamStore_pidtrymka_bot'
  const HOURS   = 'Пн–Пт 9:00–18:00'
  const ADDRESS = 'Україна'

  return (
    <div className="container-page mt-header py-4 sm:py-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h1 className="h1">Контакти</h1>
        <Link to="/" className="btn-outline">До каталогу</Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Основні контакти */}
        <div className="card">
          <div className="card-body space-y-3">
            <div>
              <div className="text-muted text-sm">Email</div>
              <a href={`mailto:${EMAIL}`} className="font-medium hover:text-indigo-600">
                {EMAIL}
              </a>
            </div>

            <div>
              <div className="text-muted text-sm">Телефон</div>
              <a href={`tel:${PHONE.replace(/\s+/g, '')}`} className="font-medium hover:text-indigo-600">
                {PHONE}
              </a>
            </div>

            <div>
              <div className="text-muted text-sm">Telegram</div>
              <a
                href={TELEBOT}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:text-indigo-600"
              >
                Відкрити бота в Telegram
              </a>
            </div>

            <div>
              <div className="text-muted text-sm">Графік</div>
              <div className="font-medium">{HOURS}</div>
            </div>

            <div>
              <div className="text-muted text-sm">Адреса</div>
              <div className="font-medium">{ADDRESS}</div>
            </div>
          </div>
        </div>

        {/* Додаткова інформація */}
        <div className="card">
          <div className="card-body space-y-2">
            <div className="h2">Як з нами звʼязатися</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>Пишіть на <a href={`mailto:${EMAIL}`} className="link">{EMAIL}</a> — відповідаємо протягом робочого дня.</li>
              <li>Швидкі питання — через <a href={TELEBOT} target="_blank" rel="noopener noreferrer" className="link">Telegram-бота</a>.</li>
              <li>У невідкладних випадках телефонуйте: <a href={`tel:${PHONE.replace(/\s+/g, '')}`} className="link">{PHONE}</a>.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
