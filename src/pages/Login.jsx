import { useState } from 'react'
import { supabase } from '../supabaseClient'

const ENABLE_PHONE = String(import.meta.env.VITE_ENABLE_PHONE_LOGIN).toLowerCase() === 'true'

export default function Login() {
  // Поля реєстрації
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Поля входу
  const [identifier, setIdentifier] = useState('') // email або телефон
  const [loginPassword, setLoginPassword] = useState('')

  const [mode, setMode] = useState('login')
  const [msg, setMsg] = useState('')

  async function register(e){
    e.preventDefault()
    setMsg('')
    try {
      // 1) Реєстрація по email + пароль
      const { data, error } = await supabase.auth.signUp({ email, password })
      if(error) throw error

      // ⚠️ Не вставляємо в profiles тут! Профіль створює тригер у БД.
      // Якщо Confirm email вимкнено — відразу увійдемо і оновимо профіль.
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
      if(!loginErr){
        const { data: s } = await supabase.auth.getSession()
        const uid = s.session?.user?.id
        if(uid){
          await supabase.from('profiles').update({ full_name: fullName, phone }).eq('user_id', uid)
        }
        setMsg('Реєстрація успішна. Ви увійшли та профіль оновлено.')
        setMode('login')
        return
      }

      // Якщо автоматичний вхід не вдався (ймовірно, увімкнено Confirm email)
      setMsg('Реєстрація успішна. Підтвердіть email і увійдіть. Після входу профіль оновиться автоматично.')
      setMode('login')
    } catch(err){ setMsg(err.message) }
  }

  async function login(e){
    e.preventDefault()
    setMsg('')
    try {
      const looksLikeEmail = identifier.includes('@')
      if(looksLikeEmail){
        const { error } = await supabase.auth.signInWithPassword({ email: identifier, password: loginPassword })
        if(error) throw error
      } else {
        if(!ENABLE_PHONE){
          throw new Error('Вхід за телефоном вимкнено. Увійдіть за email і паролем.')
        }
        const { error } = await supabase.auth.signInWithPassword({ phone: identifier, password: loginPassword })
        if(error) throw error
      }

      // Після успішного входу — оновити профіль, якщо є введені значення
      const { data: s } = await supabase.auth.getSession()
      const uid = s.session?.user?.id
      if(uid && (fullName || phone)){
        await supabase.from('profiles').update({ full_name: fullName || undefined, phone: phone || undefined }).eq('user_id', uid)
      }
      setMsg('Вхід успішний.')
    } catch(err){ setMsg(err.message) }
  }

  return (
    <div style={{maxWidth:520, margin:'32px auto'}}>
      <div style={{display:'flex', gap:12, marginBottom:16}}>
        <button onClick={()=>setMode('login')} disabled={mode==='login'}>Вхід</button>
        <button onClick={()=>setMode('register')} disabled={mode==='register'}>Реєстрація</button>
      </div>

      {mode==='register' ? (
        <form onSubmit={register} style={{display:'grid', gap:12}}>
          <input placeholder="ПІБ" value={fullName} onChange={e=>setFullName(e.target.value)} required />
          <input placeholder="Телефон (наприклад +380XXXXXXXXX)" value={phone} onChange={e=>setPhone(e.target.value)} required />
          <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <input type="password" placeholder="Пароль" value={password} onChange={e=>setPassword(e.target.value)} required />
          <button type="submit">Зареєструватися</button>
        </form>
      ) : (
        <form onSubmit={login} style={{display:'grid', gap:12}}>
          <input placeholder="Email або телефон" value={identifier} onChange={e=>setIdentifier(e.target.value)} required />
          <input type="password" placeholder="Пароль" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required />
          <button type="submit">Увійти</button>
          {!ENABLE_PHONE && <small style={{color:'#777'}}>Підказка: наразі увійти можна за email + пароль. Телефонний вхід вимкнено.</small>}
        </form>
      )}

      {msg && <p style={{color:'#555', marginTop:12}}>{msg}</p>}
    </div>
  )
}