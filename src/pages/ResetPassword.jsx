import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [hasSession, setHasSession] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMsg("Пароль оновлено. Зараз перенаправимо на вхід…");
      await supabase.auth.signOut(); // Вихід з тимчасової сесії
      setTimeout(() => nav("/login"), 800);
    } catch (e) {
      setMsg(e.message);
    }
  };

  if (!hasSession) {
    return <p>Посилання недійсне або сесія закінчилась. Спробуйте ще раз.</p>;
  }

  return (
    <div>
      <h2>Скидання пароля</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={password}
          placeholder="Новий пароль"
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Оновити</button>
      </form>
      {msg && <p>{msg}</p>}
    </div>
  );
}
