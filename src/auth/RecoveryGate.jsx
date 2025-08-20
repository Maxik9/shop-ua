// src/auth/RecoveryGate.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const KEY = "recovery_pending";
const RecoveryCtx = createContext({ pending: false, setPending: (_v) => {} });

export function RecoveryProvider({ children }) {
  const [pending, setPending] = useState(() => localStorage.getItem(KEY) === "1");
  const loc = useLocation();
  const nav = useNavigate();

  // 1) Якщо прийшли з листа у новому форматі (?code=...)
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (url.pathname.startsWith("/auth/reset")) {
        // на сторінці reset – це ок
        return;
      }
      if (url.searchParams.get("code")) {
        localStorage.setItem(KEY, "1");
        setPending(true);
        nav("/auth/reset", { replace: true });
      }
    } catch {}
  }, [nav]);

  // 2) Слухаємо івенти авторизації: PASSWORD_RECOVERY ставить pending=1
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        localStorage.setItem(KEY, "1");
        setPending(true);
        if (!window.location.pathname.startsWith("/auth/reset")) {
          nav("/auth/reset", { replace: true });
        }
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [nav]);

  // 3) Якщо є pending і користувач НЕ на /auth/reset — перенаправляємо
  useEffect(() => {
    if (pending && !loc.pathname.startsWith("/auth/reset")) {
      nav("/auth/reset", { replace: true });
    }
  }, [pending, loc.pathname, nav]);

  const value = useMemo(() => ({ pending, setPending: (v) => {
    if (v) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
    setPending(v);
  }}), [pending]);

  return <RecoveryCtx.Provider value={value}>{children}</RecoveryCtx.Provider>;
}

export function useRecovery() {
  return useContext(RecoveryCtx);
}