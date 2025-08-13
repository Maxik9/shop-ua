// src/pages/Contacts.jsx
import { useState } from 'react'

export default function Contacts() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [sent, setSent] = useState(false)

  function fakeSubmit(e) {
    e.preventDefault()
    // Тут можна зробити mailto або зберегти в Supabase таблицю "contacts"
    setSent(true)
    setTimeout(() => setSent(false), 2500)
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
            <div><span className="text-muted">Email:&nbsp;</span><span className="font-medium">support@drop-ua.example</span></div>
            <div><span className="text-muted">Телефон:&nbsp;</span><span className="font-medium">+38 (050) 000-00-00</span></div>
            <div><span className="text-muted">Графік:&nbsp;</span><span className="font-medium">Пн–Пт, 10:00–18:00</span></div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <form onSubmit={fakeSubmit} className="space-y-3">
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
              <button type="submit" className="btn-primary w-full md:w-auto">Надіслати</button>
              {sent && <div className="text-green-600 text-sm">✓ Повідомлення надіслано (демо).</div>}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
