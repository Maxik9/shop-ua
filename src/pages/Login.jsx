import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const onLogin = async (e) => {
    e.preventDefault();
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError(error.message);
    else nav('/');
  };

  const onReset = async () => {
    setError(''); setMsg('');
    const RESET_PATH = import.meta.env.VITE_RESET_PATH || '/reset-password';
    const redirectTo = `${window.location.origin}${RESET_PATH}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    if (error) setError(error.message);
    else setMsg('Перевірте пошту — ми надіслали посилання для відновлення пароля.');
  };

  return (
    <div className="max-w-md mx-auto py-16">
      <h1 className="text-2xl font-semibold mb-6">Вхід</h1>
      <form onSubmit={onLogin} className="space-y-4">
        <input className="w-full border px-3 py-2 rounded-lg" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full border px-3 py-2 rounded-lg" placeholder="Пароль" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        {error && <div className="text-red-600">{error}</div>}
        {msg && <div className="text-green-600">{msg}</div>}
        <button className="px-4 py-2 rounded-lg bg-black text-white">Увійти</button>
      </form>
      <button className="mt-4 underline" onClick={onReset}>Забули пароль?</button>
    </div>
  );
}
