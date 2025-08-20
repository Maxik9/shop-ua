// src/pages/ResetPassword.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'

export default function ResetPassword() {
  const [stage, setStage] = useState('loading') // loading | ready | done | error
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        // Новий формат посилання: ?code=...
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          setStage('ready')
          return
        }
        // Старий формат: PASSWORD_RECOVERY (hash у URL)
        const { data: sub } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY') setStage('ready')
        })
        const { data: session } = await supabase.auth.getSession()
        if (session.session) setStage('ready')
        return () => sub.subscription.unsubscribe()
      } catch (e) {
        setError(e?.message || 'Помилка авторизації')
        setStage('error')
      }
    })()
  }, [])

  async function submit(e) {
    e.preventDefault()
    if (password !== password2) { setError('Паролі не співпадають'); return }
    setLoading(true); setError('')
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setStage('done')
    } catch (e) {
      setError(e?.message || 'Не вдалося оновити пароль')
    } finally {
      setLoading(false)
    }
  }

  if (stage === 'loading') return <div className="container-page mt-header">Завантаження…</div>
  if (stage === 'error') return (
    <div className="container-page mt-header" style={{ maxWidth: 480 }}>
      <h1 className="h1 mb-4">Помилка</h1>
      <p className="text-muted">{error}</p>
    </div>
  )
  if (stage === 'done') return (
    <div className="container-page mt-header" style={{ maxWidth: 480 }}>
      <h1 className="h1 mb-4">Пароль оновлено ✅</h1>
      <Link to="/login" className="btn btn-primary">Перейти до входу</Link>
    </div>
  )

  // ready
  return (
    <div className="container-page mt-header" style={{ maxWidth: 480 }}>
      <h1 className="h1 mb-6">Новий пароль</h1>
      <form onSubmit={submit} className="card card-body">
        <label className="block mb-2 text-sm text-muted">Пароль</label>
        <input
          type="password"
          className="input mb-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Мінімум 6 символів"
          minLength={6}
          required
        />
        <label className="block mb-2 text-sm text-muted">Повторіть пароль</label>
        <input
          type="password"
          className="input mb-4"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          placeholder="Ще раз пароль"
          minLength={6}
          required
        />
        {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}
        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? 'Зберігаємо…' : 'Оновити пароль'}
        </button>
      </form>
    </div>
  )
}
