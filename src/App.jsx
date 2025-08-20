// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// ПУБЛІЧНІ сторінки
import CategoryPage from "./pages/CategoryPage";
import Forgot from "./pages/Forgot";
import ResetPassword from "./pages/ResetPassword";

// ПРИВАТНІ сторінки (якщо у тебе є guard/PrivateRoute — залиш свій)
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

// Провайдер, що блокує доступ під час відновлення пароля
import { RecoveryProvider } from "./auth/RecoveryGate";

export default function App() {
  return (
    <BrowserRouter>
      <RecoveryProvider>
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
      </RecoveryProvider>
    </BrowserRouter>
  );
}