// src/pages/Contacts.jsx
import { useState } from 'react'
import { supabase } from '../supabaseClient'

/**
 * Налаштування:
 * - Вкажи пошту, куди мають приходити звернення (або винеси в .env як VITE_CONTACT_EMAIL)
 * - Вкажи URL на твого Telegram-бота
 */
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'mdshop784@gmail.com'
const TELEGRAM_BOT_URL = import.meta.env.VITE_TELEGRAM_BOT_URL || 'https://t.me/DreamStore_pidtrymka_bot'

export default function Contacts() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [sent, setSent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')

    // 1) Спроба зберегти звернення в Supabase (необов’язково, але корисно)
    try {
      setSaving(true)
      await supabase.from('contact_messages').insert({
        name: name.trim(),
        email: email.trim(),
        message: msg.trim(),
      })
    } catch (_) {
      // помилку збереження ігноруємо для UX, або можеш показати setErr
    } finally {
      setSaving(false)
    }

    // 2) Відкрити поштовий клієнт користувача з готовим листом (mailto)
    const subject = encodeURIComponent(`Запит з контактної форми від ${name.trim()}`)
    const body = encodeURIComponent(
      `Ім’я: ${name}\nEmail: ${email}\n\nПовідомлення:\n${msg}\n\n---\nНадіслано зі сторінки Контакти ShopUa`
    )
    const mailto = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
    window.location.href = mailto

    // Очистити форму та показати "надіслано"
    setSent(true)
    setTimeout(() => setSent(false), 3000)
    setName(''); setEmail(''); setMsg('')
  }

  return (
    <div className="max-w-6xl mx-auto px-3 py-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h1 className="h1 mb-3">Контакти</h1>
          <p className="text-[15px] leading-7 text-slate-700">
            Маєш запитання щодо співпраці або товарів — напиши нам. Відповідаємо протягом робочого дня.
          </p>

          <div className="mt-4 space-y-2 text-[15px]">
            <div>
              <span className="text-muted">Email:&nbsp;</span>
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium hover:text-indigo-600">
                {CONTACT_EMAIL}
              </a>
            </div>
            <div>
              <span className="text-muted">Telegram:&nbsp;</span>
              <a href={TELEGRAM_BOT_URL} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-indigo-600">
                Написати в бота
              </a>
            </div>
            <div>
              <span className="text-muted">Телефон:&nbsp;</span>
              <span className="font-medium">+38 (050) 000-00-00</span>
            </div>
            <div>
              <span className="text-muted">Графік:&nbsp;</span>
              <span className="font-medium">Пн–Пт, 10:00–18:00</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label">Ваше імʼя</label>
                <input className="input" value={name} onChange={e=>setName(e.target.value)} required />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="label">Повідомлення</label>
                <textarea className="input" rows="4" value={msg} onChange={e=>setMsg(e.target.value)} required />
              </div>

              <div className="flex items-center gap-2">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Зберігаємо…' : 'Надіслати'}
                </button>
                {sent && <div className="text-green-600 text-sm">✓ Відкрито лист у поштовому клієнті.</div>}
                {err && <div className="text-red-600 text-sm">{err}</div>}
              </div>

              <div className="text-xs text-muted">
                Натискання «Надіслати» відкриє ваш поштовий клієнт з підставленими полями листа.
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
