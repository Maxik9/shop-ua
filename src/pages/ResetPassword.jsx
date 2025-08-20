// src/pages/ResetPassword.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate, Link } from 'react-router-dom'

export default function ResetPassword() {
  const nav = useNavigate()
  const [ready, setReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      // Після переходу по листу Supabase піднімає тимчасову сесію
      const { data } = await supabase.auth.getSession()
      setHasSession(Boolean(data.session?.user))
      setReady(true)
    })()
  }, [])

  async function saveNewPassword(e) {
    e.preventDefault()
    setError(''); setMsg('')
    if (password.length < 6) { setError('Пароль має містити щонайменше 6 символів'); return }
    if (password !== password2) { setError('Паролі не співпадають'); return }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setMsg('Пароль оновлено. Зараз перенаправимо на сторінку входу…')
      await supabase.auth.signOut()
      nav('/login')
    } catch (e) {
      setError(e.message || 'Не вдалося оновити пароль. Спробуйте ще раз.')
    } finally {
      setLoading(false)
    }
  }

  if (!ready) {
    return <div className="max-w-6xl mx-auto px-3 py-6">Перевіряємо посилання…</div>
  }

  return (
    <div className="max-w-6xl mx-auto px-3 py-6">
      <div className="max-w-md mx-auto">
        <h1 className="h1 mb-4">Скидання пароля</h1>

        {!hasSession ? (
          <div className="card">
            <div className="card-body space-y-3">
              <div className="text-muted">
                Посилання для відновлення недійсне або прострочене. Будь ласка,
                повторіть «Забули пароль?» на сторінці <Link className="text-indigo-600 hover:underline" to="/login">входу</Link>.
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-body">
              <form onSubmit={saveNewPassword} className="space-y-3">
                <div>
                  <label className="label">Новий пароль</label>
                  <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Повторіть пароль</label>
                  <input className="input" type="password" value={password2} onChange={e=>setPassword2(e.target.value)} required />
                </div>
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Зберігаємо…' : 'Зберегти новий пароль'}
                </button>
                {msg && <div className="text-green-600 text-sm mt-2">{msg}</div>}
                {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
