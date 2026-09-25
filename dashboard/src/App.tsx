import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RolePage } from "./pages/RolePage";
import { StoreCreatePage } from "./pages/ShopCreatePage";
import { StoreEditPage } from "./pages/ShopEditPage";
import { StoresPage } from "./pages/ShopsPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { CategoryCreatePage } from "./pages/CategoryCreatePage";
import { CategoryEditPage } from "./pages/CategoryEditPage";
import { ProductsPage } from "./pages/ProductsPage";
import { ProductCreatePage } from "./pages/ProductCreatePage";
import { ProductEditPage } from "./pages/ProductEditPage";
import { BrandsPage } from "./pages/BrandsPage";
import { BrandCreatePage } from "./pages/BrandCreatePage";
import { BrandEditPage } from "./pages/BrandEditPage";
import { UserEditPage } from "./pages/UserEditPage";
import { UsersPage } from "./pages/UsersPage";
import { SiteSettingsPage } from "./pages/SiteSettingsPage";
import { OrderDetailPage, OrdersPage } from "./pages/OrdersPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { useAuthStore } from "./store/auth";
import type { StaffRole } from "./lib/api";

const ROLE_HOME: Record<StaffRole, string> = {
  super_admin: "/super-admin",
  admin: "/admin",
  moderator: "/moderator",
  vendor: "/vendor",
};

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
          <Route path="profile" element={<ProfilePage />} />

          <Route
            element={
              <ProtectedRoute
                roles={["super_admin", "admin", "moderator", "vendor"]}
              />
            }
          >
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={["super_admin"]} />}>
            <Route path="users" element={<UsersPage />} />
            <Route path="users/:id" element={<UserEditPage />} />
            <Route
              path="super-admin"
              element={<RolePage role="Super Admin" />}
            />
            <Route path="settings" element={<SiteSettingsPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={["super_admin", "vendor"]} />}>
            <Route path="stores" element={<StoresPage />} />
            <Route path="stores/new" element={<StoreCreatePage />} />
            <Route path="stores/:slug" element={<StoreEditPage />} />
            <Route path="shops" element={<StoresPage />} />
            <Route path="shops/new" element={<StoreCreatePage />} />
            <Route path="shops/:slug" element={<StoreEditPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute
                roles={["super_admin", "admin", "moderator", "vendor"]}
              />
            }
          >
            <Route path="categories" element={<CategoriesPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute roles={["super_admin", "admin", "moderator"]} />
            }
          >
            <Route path="categories/new" element={<CategoryCreatePage />} />
            <Route path="categories/:id" element={<CategoryEditPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute
                roles={["super_admin", "admin", "moderator", "vendor"]}
              />
            }
          >
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/new" element={<ProductCreatePage />} />
            <Route path="products/:id" element={<ProductEditPage />} />
            <Route path="brands" element={<BrandsPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute roles={["super_admin", "admin", "moderator"]} />
            }
          >
            <Route path="brands/new" element={<BrandCreatePage />} />
            <Route path="brands/:id" element={<BrandEditPage />} />
          </Route>

          <Route
            element={<ProtectedRoute roles={["admin", "super_admin"]} />}
          >
            <Route path="admin" element={<RolePage role="Admin" />} />
          </Route>

          <Route
            element={
              <ProtectedRoute roles={["moderator", "super_admin"]} />
            }
          >
            <Route path="moderator" element={<RolePage role="Moderator" />} />
          </Route>

          <Route
            element={<ProtectedRoute roles={["vendor", "super_admin"]} />}
          >
            <Route path="vendor" element={<RolePage role="Vendor" />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<RoleHomeRedirect />} />
    </Routes>
  );
}
