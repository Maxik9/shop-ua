// src/pages/Login.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate, Link } from 'react-router-dom'

const ENABLE_PHONE = String(import.meta.env.VITE_ENABLE_PHONE_LOGIN || 'false') === 'true'

const RESET_PATH = import.meta.env.VITE_RESET_PATH || '/reset-password'

export default function Login() {
  const nav = useNavigate()
  const [tab, setTab] = useState('signin') // signin | signup | phone
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  // signin
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // signup
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')

  // phone OTP (optional)
  const [phoneNum, setPhoneNum] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) nav('/')
    })
  }, [nav])

  async function doSignIn(e) {
    e.preventDefault()
    setError(''); setMsg(''); setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
      nav('/')
    } catch (e) {
      setError(e.message || 'Помилка входу')
    } finally { setLoading(false) }
  }

  async function doSignUp(e) {
    e.preventDefault()
    setError(''); setMsg(''); setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email: regEmail.trim(),
        password: regPassword,
        options: { data: { full_name: fullName.trim(), phone: phone.trim() || null } }
      })
      if (error) throw error
      setMsg('Перевірте пошту для підтвердження реєстрації.')
      setTab('signin')
    } catch (e) {
      setError(e.message || 'Помилка реєстрації')
    } finally { setLoading(false) }
  }

  // Забули пароль? — відправити лист з посиланням на /reset-password
  async function sendResetLink() {
    setError(''); setMsg(''); setLoading(true)
    try {
      const redirectTo = `${window.location.origin}${RESET_PATH}`
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
      if (error) throw error
      setMsg('Лист для відновлення пароля надіслано. Перевірте вашу пошту.')
    } catch (e) {
      setError(e.message || 'Не вдалося надіслати лист для скидання пароля')
    } finally { setLoading(false) }
  }

  // Phone OTP (optional)
  async function sendOtp(e) {
    e.preventDefault()
    setError(''); setMsg(''); setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: phoneNum.trim() })
      if (error) throw error
      setOtpSent(true)
      setMsg('Надіслали SMS з кодом.')
    } catch (e) {
      setError(e.message || 'Не вдалося надіслати код')
    } finally { setLoading(false) }
  }
  async function verifyOtp(e) {
    e.preventDefault()
    setError(''); setMsg(''); setLoading(true)
    try {
      const { error } = await supabase.auth.verifyOtp({ phone: phoneNum.trim(), token: otp.trim(), type: 'sms' })
      if (error) throw error
      nav('/')
    } catch (e) {
      setError(e.message || 'Код невірний')
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-6xl mx-auto px-3 py-6">
      <div className="max-w-xl mx-auto">
        <h1 className="h1 mb-4">Вхід / Реєстрація</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button className={`btn-outline ${tab==='signin' ? '!bg-indigo-50 !border-indigo-600 !text-indigo-700' : ''}`} onClick={() => setTab('signin')}>Вхід (email)</button>
          <button className={`btn-outline ${tab==='signup' ? '!bg-indigo-50 !border-indigo-600 !text-indigo-700' : ''}`} onClick={() => setTab('signup')}>Реєстрація</button>
          {ENABLE_PHONE && (
            <button className={`btn-outline ${tab==='phone' ? '!bg-indigo-50 !border-indigo-600 !text-indigo-700' : ''}`} onClick={() => setTab('phone')}>Вхід по телефону (OTP)</button>
          )}
        </div>

        <div className="card">
          <div className="card-body">
            {tab === 'signin' && (
              <form onSubmit={doSignIn} className="space-y-3">
                <div>
                  <label className="label">Email</label>
                  <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Пароль</label>
                  <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
                </div>

                <div className="flex items-center justify-between">
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Входимо…' : 'Увійти'}
                  </button>
                  <button type="button" onClick={sendResetLink} className="text-sm text-indigo-600 hover:underline disabled:opacity-50" disabled={loading || !email}>
                    Забули пароль?
                  </button>
                </div>
              </form>
            )}

            {tab === 'signup' && (
              <form onSubmit={doSignUp} className="space-y-3">
                <div>
                  <label className="label">ПІБ</label>
                  <input className="input" value={fullName} onChange={e=>setFullName(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Телефон (необовʼязково)</label>
                  <input className="input" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+380…" />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input" type="email" value={regEmail} onChange={e=>setRegEmail(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Пароль</label>
                  <input className="input" type="password" value={regPassword} onChange={e=>setRegPassword(e.target.value)} required />
                </div>
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Реєструємо…' : 'Зареєструватися'}
                </button>
              </form>
            )}

            {tab === 'phone' && ENABLE_PHONE && (
              <form onSubmit={otpSent ? verifyOtp : sendOtp} className="space-y-3">
                <div>
                  <label className="label">Телефон</label>
                  <input className="input" value={phoneNum} onChange={e=>setPhoneNum(e.target.value)} placeholder="+380…" required />
                </div>
                {otpSent && (
                  <div>
                    <label className="label">Код з SMS</label>
                    <input className="input" value={otp} onChange={e=>setOtp(e.target.value)} required />
                  </div>
                )}
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Надсилаємо…' : otpSent ? 'Підтвердити код' : 'Надіслати код'}
                </button>
                <div className="text-xs text-muted">
                  Потрібен увімкнений SMS-провайдер у Supabase і `VITE_ENABLE_PHONE_LOGIN=true`.
                </div>
              </form>
            )}

            {msg && <div className="text-green-600 mt-3 text-sm">{msg}</div>}
            {error && <div className="text-red-600 mt-3 text-sm">{error}</div>}

            <div className="mt-4 text-sm text-muted">
              Повернутися до <Link to="/" className="text-indigo-600 hover:underline">каталогу</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
