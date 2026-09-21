import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RolePage } from "./pages/RolePage";
import { useAuthStore } from "./store/auth";

const ROLE_HOME = {
  super_admin: "/super-admin",
  admin: "/admin",
  moderator: "/moderator",
  vendor: "/vendor",
} as const;

function RoleHomeRedirect() {
  const user = useAuthStore((state) => state.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[user.role]} replace />;
}

function OverviewGate() {
  const user = useAuthStore((state) => state.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "super_admin" || user.role === "admin") {
    return <HomePage />;
  }
  return <Navigate to={ROLE_HOME[user.role]} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<OverviewGate />} />

          <Route element={<ProtectedRoute roles={["super_admin"]} />}>
            <Route
              path="super-admin"
              element={<RolePage role="Super Admin" />}
            />
          </Route>

          <Route element={<ProtectedRoute roles={["admin"]} />}>
            <Route path="admin" element={<RolePage role="Admin" />} />
          </Route>

          <Route element={<ProtectedRoute roles={["moderator"]} />}>
            <Route path="moderator" element={<RolePage role="Moderator" />} />
          </Route>

          <Route element={<ProtectedRoute roles={["vendor"]} />}>
            <Route path="vendor" element={<RolePage role="Vendor" />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<RoleHomeRedirect />} />
    </Routes>
  );
}
