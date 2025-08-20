import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setMsg("Лист з інструкціями надіслано.");
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <div>
      <h2>Відновлення пароля</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          placeholder="Ваш email"
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit">Надіслати</button>
      </form>
      {msg && <p>{msg}</p>}
    </div>
  );
}
