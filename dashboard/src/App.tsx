import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { HomePage } from "./pages/HomePage";
import { RolePage } from "./pages/RolePage";

export default function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<HomePage />} />
        <Route path="super-admin" element={<RolePage role="Super Admin" />} />
        <Route path="admin" element={<RolePage role="Admin" />} />
        <Route path="moderator" element={<RolePage role="Moderator" />} />
        <Route path="vendor" element={<RolePage role="Vendor" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
