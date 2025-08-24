// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Login() {
  const nav = useNavigate();

  // "signin" | "signup"
  const [tab, setTab] = useState("signin");

  // -------- state: sign in
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwdIn, setShowPwdIn] = useState(false);

  // -------- state: sign up
  const [sFullName, setSFullName] = useState("");
  const [sEmail, setSEmail] = useState("");
  const [sPassword, setSPassword] = useState("");
  const [showPwdUp, setShowPwdUp] = useState(false);

  // -------- ui
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const resetMessages = () => { setErr(""); setMsg(""); };

  // ---------- actions ----------
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
    nav("/");
  };

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
    setMsg("Реєстрація успішна. Перевірте пошту — лист підтвердження може потрапити у «Спам».");
    setTab("signin");
    setEmail(sEmail);
  };

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

  // ---------- ui ----------
  const TabButton = ({ id, children }) => (
    <button
      type="button"
      className={`btn-tab ${tab === id ? "active" : ""}`}
      onClick={() => { resetMessages(); setTab(id); }}
      aria-current={tab === id ? "page" : undefined}
    >
      {children}
    </button>
  );

  return (
    <div className="container-page mt-header">
      <div className="max-w-md mx-auto">
        <div className="card shadow-lg">
          <div className="card-body">
            {/* Tabs */}
            <div className="flex items-center gap-2 mb-5">
              <TabButton id="signin">Вхід</TabButton>
              <TabButton id="signup">Реєстрація</TabButton>
            </div>

            {/* Alerts */}
            {err && (
              <div className="alert alert-error mb-4">
                <span>{err}</span>
              </div>
            )}
            {msg && (
              <div className="alert alert-success mb-4">
                <span>{msg}</span>
              </div>
            )}

            {/* -------- SIGN IN -------- */}
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
                  <div className="relative">
                    <input
                      type={showPwdIn ? "text" : "password"}
                      className="input pr-12"
                      placeholder="Ваш пароль"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwdIn((s) => !s)}
                      className="btn-link absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                      aria-label={showPwdIn ? "Сховати пароль" : "Показати пароль"}
                      tabIndex={-1}
                    >
                      {showPwdIn ? "Сховати" : "Показати"}
                    </button>
                  </div>
                </label>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="btn-link text-sm"
                    onClick={onReset}
                    disabled={loading}
                  >
                    Забули пароль?
                  </button>
                </div>

                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? "Входимо…" : "Увійти"}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 my-2">
                  <div className="h-px flex-1 bg-slate-200" />
                  <div className="text-xs uppercase text-slate-500">або</div>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                {/* CTA to signup */}
                <div className="text-center text-sm">
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

            {/* -------- SIGN UP -------- */}
            {tab === "signup" && (
              <form className="space-y-4" onSubmit={onSignup}>
                <label className="label">
                  <span className="label-text">Ім’я</span>
                  <input
                    className="input"
                    placeholder="Ваше ім’я"
                    value={sFullName}
                    onChange={(e) => setSFullName(e.target.value)}
                  />
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
                  <div className="relative">
                    <input
                      type={showPwdUp ? "text" : "password"}
                      className="input pr-12"
                      placeholder="Мінімум 6 символів"
                      value={sPassword}
                      onChange={(e) => setSPassword(e.target.value)}
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwdUp((s) => !s)}
                      className="btn-link absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                      aria-label={showPwdUp ? "Сховати пароль" : "Показати пароль"}
                      tabIndex={-1}
                    >
                      {showPwdUp ? "Сховати" : "Показати"}
                    </button>
                  </div>
                </label>

                <div className="flex gap-3">
                  <button
                    type="button"
                    className="btn-outline flex-1"
                    onClick={() => { resetMessages(); setTab("signin"); }}
                  >
                    Назад
                  </button>
                  <button type="submit" className="btn-primary flex-1" disabled={loading}>
                    {loading ? "Реєструємо…" : "Зареєструватись"}
                  </button>
                </div>

                <p className="text-xs text-slate-500 text-center">
                  Реєструючись, ви погоджуєтесь з умовами сервісу.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
