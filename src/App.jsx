import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

import NavBar from "./components/NavBar";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Forgot from "./pages/Forgot";
import ResetPassword from "./pages/ResetPassword";
import Admin from "./pages/Admin";
import AdminOrders from "./pages/AdminOrders";
// імпортуй сюди решту сторінок, які вже є

function PrivateRoute({ children, recovering }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
      setReady(true);
    });
  }, []);

  if (!ready) return null;
  if (recovering) return <Navigate to="/reset-password" />;
  return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children, recovering }) {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        setReady(true);
        setAllowed(false);
        return;
      }
      // приклад RPC для перевірки адміна
      const { data: ok } = await supabase.rpc("is_admin", { u: user.id });
      setAllowed(Boolean(ok));
      setReady(true);
    })();
  }, []);

  if (!ready) return null;
  if (recovering) return <Navigate to="/reset-password" />;
  return allowed ? children : <Navigate to="/" />;
}

export default function App() {
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      if (event === "USER_UPDATED" || event === "SIGNED_OUT")
        setRecovering(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <>
      <NavBar />
      <Routes>
        {/* публічні */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* приватні */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute recovering={recovering}>
              <Dashboard />
            </PrivateRoute>
          }
        />

        {/* адмін */}
        <Route
          path="/admin"
          element={
            <AdminRoute recovering={recovering}>
              <Admin />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <AdminRoute recovering={recovering}>
              <AdminOrders />
            </AdminRoute>
          }
        />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </>
  );
}
