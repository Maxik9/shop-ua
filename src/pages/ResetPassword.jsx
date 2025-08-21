import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function ResetPassword() {
  const nav = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) setError('Посилання прострочене або недійсне. Спробуйте ще раз.');
    });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('Мінімум 6 символів.');
    if (password !== confirm) return setError('Паролі не співпадають.');

    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); return; }

    await supabase.auth.signOut();
    setOk(true);
    setTimeout(()=> nav('/login'), 700);
  };

  return (
    <div className="max-w-md mx-auto py-16">
      <h1 className="text-2xl font-semibold mb-6">Скидання пароля</h1>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      {ok ? (
        <div className="text-green-700">Пароль оновлено. Переходимо на сторінку входу…</div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <input className="w-full border px-3 py-2 rounded-lg" type="password" placeholder="Новий пароль" value={password} onChange={e=>setPassword(e.target.value)} />
          <input className="w-full border px-3 py-2 rounded-lg" type="password" placeholder="Повторіть пароль" value={confirm} onChange={e=>setConfirm(e.target.value)} />
          <button className="px-4 py-2 rounded-lg bg-black text-white">Зберегти</button>
        </form>
      )}
    </div>
  );
}
