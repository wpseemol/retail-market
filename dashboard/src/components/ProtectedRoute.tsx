import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { StaffRole } from "../lib/api";
import { useAuthStore } from "../store/auth";

const ROLE_HOME: Record<StaffRole, string> = {
  super_admin: "/super-admin",
  admin: "/admin",
  moderator: "/moderator",
  vendor: "/vendor",
};

type ProtectedRouteProps = {
  roles?: StaffRole[];
};

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const location = useLocation();
  const { token, user } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (
    roles &&
    !roles.includes(user.role) &&
    user.role !== "super_admin"
  ) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }

  return <Outlet />;
}
