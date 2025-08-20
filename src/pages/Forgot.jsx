// src/pages/Forgot.jsx
import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'

export default function Forgot() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(''); setSent(false); setLoading(true)
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      })
      if (err) throw err
      setSent(true)
    } catch (e) {
      setError(e?.message || 'Не вдалося надіслати лист.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-page mt-header" style={{ maxWidth: 480 }}>
      <h1 className="h1 mb-6">Скидання пароля</h1>
      {sent ? (
        <div className="card card-body">
          <p className="mb-2">Ми надіслали посилання на <b>{email}</b>.</p>
          <p className="text-muted text-sm">Перевірте вхідні та спам.</p>
          <div className="mt-4">
            <Link to="/login" className="btn btn-outline w-full">Повернутися до входу</Link>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="card card-body">
          <label className="block mb-2 text-sm text-muted">Email</label>
          <input
            type="email"
            className="input mb-4"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Надсилаємо…' : 'Надіслати посилання'}
          </button>
          <div className="mt-3 text-sm">
            <Link to="/login" className="text-muted">Згадали пароль? Увійти</Link>
          </div>
        </form>
      )}
    </div>
  )
}
