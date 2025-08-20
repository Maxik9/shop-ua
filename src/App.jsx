import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Forgot from "./pages/Forgot";
import ResetPassword from "./pages/ResetPassword";
import { RecoveryProvider } from "./auth/RecoveryGate";

export default function App() {
  return (
    <BrowserRouter>
      <RecoveryProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/auth/forgot" element={<Forgot />} />
          <Route path="/auth/reset" element={<ResetPassword />} />
          {/* fallback для старих листів */}
          <Route path="/reset-password" element={<Navigate to="/auth/reset" replace />} />
          {/* 404 → на головну */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </RecoveryProvider>
    </BrowserRouter>
  );
}