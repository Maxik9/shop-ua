// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";

// ПУБЛІЧНІ сторінки (усі в src/pages/)
import CategoryPage from "./pages/CategoryPage";
import Forgot from "./pages/Forgot";
import ResetPassword from "./pages/ResetPassword";

// ПРИВАТНІ (за потреби обгорнеш у свій PrivateRoute)
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <Routes>
      {/* Головна → одразу категорії */}
      <Route path="/" element={<CategoryPage />} />

      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/auth/forgot" element={<Forgot />} />
      <Route path="/auth/reset" element={<ResetPassword />} />
      {/* fallback для старих листів */}
      <Route path="/reset-password" element={<Navigate to="/auth/reset" replace />} />

      {/* Кабінет */}
      <Route path="/dashboard" element={<Dashboard />} />

      {/* 404 → на головну */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}