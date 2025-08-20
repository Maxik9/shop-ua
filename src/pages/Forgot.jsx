import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    if (error) setErr(error.message || "Не вдалося надіслати лист.");
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="container-page mt-header" style={{ maxWidth: 480 }}>
        <h1 className="h1 mb-4">Перевірте пошту 📩</h1>
        <p className="text-muted">Ми надіслали посилання на <b>{email}</b>.</p>
      </div>
    );
  }

  return (
    <div className="container-page mt-header" style={{ maxWidth: 480 }}>
      <h1 className="h1 mb-6">Скидання пароля</h1>
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
        {err && <div className="mb-3 text-red-600 text-sm">{err}</div>}
        <button className="btn btn-primary w-full">Надіслати лист</button>
      </form>
    </div>
  );
}