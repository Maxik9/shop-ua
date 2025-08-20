import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useRecovery } from "../auth/RecoveryGate";

export default function ResetPassword() {
  const { pending, setPending } = useRecovery();
  const [stage, setStage] = useState("loading"); // loading | ready | done | error
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // 1) Обміняти code на сесію (новий формат) або чекнути наявну сесію/подію
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchErr) throw exchErr;
          if (mounted) setStage("ready");
          return;
        }
        // Якщо вже є сесія – все одно дозволяємо змінити пароль
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          if (mounted) setStage("ready");
          return;
        }
        // fallback – чекаємо подію
        const { data: sub } = supabase.auth.onAuthStateChange((event) => {
          if (event === "PASSWORD_RECOVERY") setStage("ready");
        });
        return () => sub.subscription.unsubscribe();
      } catch (e) {
        setError(e?.message || "Помилка авторизації");
        setStage("error");
      }
    })();
    return () => { mounted = false; };
  }, []);

  // 2) Надіслати новий пароль
  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    const { error: updErr } = await supabase.auth.updateUser({ password });
    if (updErr) {
      setError(updErr.message || "Не вдалося оновити пароль");
      return;
    }
    // Готово: прибираємо блокування, дозволяємо доступ до кабінету
    setPending(false);
    setStage("done");
  }

  if (stage === "loading") {
    return <div className="container-page mt-header">Завантаження…</div>;
  }
  if (stage === "done") {
    return (
      <div className="container-page mt-header" style={{ maxWidth: 480 }}>
        <h1 className="h1 mb-4">Пароль оновлено ✅</h1>
        <p>Тепер можна увійти з новим паролем.</p>
      </div>
    );
  }
  if (stage === "error") {
    return (
      <div className="container-page mt-header" style={{ maxWidth: 480 }}>
        <h1 className="h1 mb-4">Помилка</h1>
        <p className="text-muted">{error}</p>
      </div>
    );
  }

  // stage === 'ready'
  return (
    <div className="container-page mt-header" style={{ maxWidth: 480 }}>
      <h1 className="h1 mb-6">Новий пароль</h1>
      <form onSubmit={onSubmit} className="card card-body">
        <label className="block mb-2 text-sm text-muted">Введіть новий пароль</label>
        <input
          type="password"
          className="input mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Мінімум 6 символів"
          minLength={6}
          required
        />
        {pending && (
          <div className="mb-3 text-sm text-muted">
            Ви у режимі відновлення пароля — доступ до кабінету закрито, доки не створите новий пароль.
          </div>
        )}
        {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}
        <button className="btn btn-primary w-full">Оновити пароль</button>
      </form>
    </div>
  );
}