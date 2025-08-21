// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Login() {
  const nav = useNavigate();

  // було: useState<"signin" | "signup">("signin")
  const [tab, setTab] = useState("signin"); // "signin" | "signup"

  // signin
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // signup
  const [sEmail, setSEmail] = useState("");
  const [sPassword, setSPassword] = useState("");
  const [sFullName, setSFullName] = useState("");

  // ui
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const resetMessages = () => {
    setErr("");
    setMsg("");
  };

  // -------- SIGN IN --------
  const onSignin = async (e) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) return setErr(error.message);
    nav("/"); // успішний вхід
  };

  // -------- SIGN UP --------
  const onSignup = async (e) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: sEmail.trim(),
      password: sPassword,
      options: {
        data: { full_name: sFullName || "" },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    setLoading(false);
    if (error) return setErr(error.message);
    setMsg("Реєстрація успішна. Перевірте пошту — лист підтвердження може бути у «Спам».");
    setTab("signin");
    setEmail(sEmail);
  };

  // -------- RESET PASSWORD --------
  const onReset = async () => {
    resetMessages();
    if (!email.trim()) return setErr("Вкажіть email для відновлення пароля.");
    const RESET_PATH = import.meta.env.VITE_RESET_PATH || "/reset-password";
    const redirectTo = `${window.location.origin}${RESET_PATH}`;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setLoading(false);
    if (error) return setErr(error.message);
    setMsg("Надіслали посилання для відновлення пароля на вашу пошту.");
  };

  return (
    <div className="container-page mt-header">
      <div className="max-w-md mx-auto">
        <div className="card">
          <div className="card-body">
            {/* Tabs */}
            <div className="flex items-center gap-3 mb-6">
              <button
                className={`btn-tab ${tab === "signin" ? "active" : ""}`}
                onClick={() => { resetMessages(); setTab("signin"); }}
              >
                Вхід
              </button>
              <button
                className={`btn-tab ${tab === "signup" ? "active" : ""}`}
                onClick={() => { resetMessages(); setTab("signup"); }}
              >
                Реєстрація
              </button>
            </div>

            {/* Alerts */}
            {err && <div className="alert alert-error mb-4"><span>{err}</span></div>}
            {msg && <div className="alert alert-success mb-4"><span>{msg}</span></div>}

            {/* -------- TAB: SIGN IN -------- */}
            {tab === "signin" && (
              <form className="space-y-4" onSubmit={onSignin}>
                <label className="label">
                  <span className="label-text">Email</span>
                  <input
                    type="email"
                    className="input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>

                <label className="label">
                  <span className="label-text">Пароль</span>
                  <input
                    type="password"
                    className="input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </label>

                <div className="flex items-center justify-between">
                  <button type="button" className="btn-link text-sm" onClick={onReset} disabled={loading}>
                    Забули пароль?
                  </button>
                </div>

                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? "Входимо…" : "Увійти"}
                </button>

                {/* Додатковий CTA під формою входу */}
                <div className="text-center mt-3 text-sm">
                  Немає акаунта?{" "}
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => { resetMessages(); setSEmail(email); setTab("signup"); }}
                  >
                    Зареєструватись
                  </button>
                </div>
              </form>
            )}

            {/* -------- TAB: SIGN UP -------- */}
            {tab === "signup" && (
              <form className="space-y-4" onSubmit={onSignup}>
                <label className="label">
                  <span className="label-text">Ім’я (необов’язково)</span>
                  <input className="input" placeholder="Ваше ім’я"
                         value={sFullName} onChange={(e) => setSFullName(e.target.value)} />
                </label>

                <label className="label">
                  <span className="label-text">Email</span>
                  <input
                    type="email"
                    className="input"
                    placeholder="you@example.com"
                    value={sEmail}
                    onChange={(e) => setSEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>

                <label className="label">
                  <span className="label-text">Пароль</span>
                  <input
                    type="password"
                    className="input"
                    placeholder="Мінімум 6 символів"
                    value={sPassword}
                    onChange={(e) => setSPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </label>

                <div className="flex gap-3">
                  <button type="button" className="btn-outline flex-1" onClick={() => { resetMessages(); setTab("signin"); }}>
                    Назад
                  </button>
                  <button type="submit" className="btn-primary flex-1" disabled={loading}>
                    {loading ? "Реєструємо…" : "Зареєструватись"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
