import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        // Профиль создаст триггер, но обновим ФИО/телефон
        if (data.user) {
          await supabase.from('profiles').update({
            full_name: fullName || '',
            phone: phone || null
          }).eq('user_id', data.user.id)
        }
      }
      navigate('/')
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-page my-10">
      <div className="max-w-md mx-auto card">
        <form className="card-body" onSubmit={onSubmit}>
          <h1 className="h1 mb-2">{mode==='login' ? 'Вхід' : 'Реєстрація'}</h1>
          <p className="text-muted mb-4">
            {mode==='login' ? 'Увійдіть до свого кабінету' : 'Створіть обліковий запис щоб оформляти замовлення'}
          </p>

          {mode==='signup' && (
            <>
              <div className="mb-3">
                <div className="text-sm text-muted mb-1">ПІБ</div>
                <input className="input" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Ім'я Прізвище" />
              </div>
              <div className="mb-3">
                <div className="text-sm text-muted mb-1">Телефон</div>
                <input className="input" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+380…" />
              </div>
            </>
          )}

          <div className="mb-3">
            <div className="text-sm text-muted mb-1">Email</div>
            <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@mail.com" />
          </div>
          <div className="mb-4">
            <div className="text-sm text-muted mb-1">Пароль</div>
            <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" />
          </div>

          <div className="flex gap-3">
            <button className="btn-primary" disabled={loading} type="submit">
              {loading ? 'Зачекайте…' : (mode==='login' ? 'Увійти' : 'Зареєструватися')}
            </button>
            <button type="button" className="btn-outline" onClick={()=>setMode(mode==='login'?'signup':'login')}>
              {mode==='login' ? 'Створити акаунт' : 'У мене вже є акаунт'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
