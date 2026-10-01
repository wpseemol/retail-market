import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { LoginPage } from "./pages/auth";
import { HomePage, RolePage } from "./pages/overview";
import { NotificationsPage, ProfilePage } from "./pages/account";
import { OrderDetailPage, OrdersPage } from "./pages/orders";
import {
  BrandCreatePage,
  BrandEditPage,
  BrandsPage,
  CategoriesPage,
  CategoryCreatePage,
  CategoryEditPage,
  ProductCreatePage,
  ProductEditPage,
  ProductsPage,
} from "./pages/catalog";
import { StoreCreatePage, StoreEditPage, StoresPage } from "./pages/stores";
import { UserEditPage, UsersPage } from "./pages/access";
import { ReviewsModerationPage } from "./pages/support";
import {
  AnalyticsSettingsPage,
  EmailProviderSettingsPage,
  FooterSettingsPage,
  HeaderSettingsPage,
  HistorySettingsPage,
  HomeSettingsPage,
  IdentitySettingsPage,
  PaymentSettingsPage,
  PixelsSettingsPage,
  ShippingSettingsPage,
  ShopSettingsPage,
  SiteSettingsLayout,
  SmsGatewaySettingsPage,
  SocialLoginSettingsPage,
  SocialShareSettingsPage,
} from "./pages/system/settings";
import { useAuthStore } from "./store/auth";
import type { StaffRole } from "./lib/api";
import {
  NOTIFICATION_ROLES,
  ORDER_ROLES,
  OVERVIEW_ROLES,
  PRODUCT_ROLES,
  REVIEW_ROLES,
  STAFF_MANAGEMENT_ROLES,
  STORE_ROLES,
  SYSTEM_SETTINGS_ROLES,
  TAXONOMY_MANAGE_ROLES,
  TAXONOMY_VIEW_ROLES,
  WORKSPACE_ROLES,
} from "./lib/rbac";

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
  if (OVERVIEW_ROLES.includes(user.role)) {
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

          <Route element={<ProtectedRoute roles={NOTIFICATION_ROLES} />}>
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={ORDER_ROLES} />}>
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={REVIEW_ROLES} />}>
            <Route path="support/reviews" element={<ReviewsModerationPage />} />
            <Route path="reviews" element={<Navigate to="/support/reviews" replace />} />
          </Route>

          <Route element={<ProtectedRoute roles={STAFF_MANAGEMENT_ROLES} />}>
            <Route path="users" element={<UsersPage />} />
            <Route path="users/:id" element={<UserEditPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={SYSTEM_SETTINGS_ROLES} />}>
            <Route path="settings" element={<SiteSettingsLayout />}>
              <Route index element={<Navigate to="identity" replace />} />
              <Route path="identity" element={<IdentitySettingsPage />} />
              <Route path="header" element={<HeaderSettingsPage />} />
              <Route path="footer" element={<FooterSettingsPage />} />
              <Route path="home" element={<HomeSettingsPage />} />
              <Route path="shop" element={<ShopSettingsPage />} />
              <Route path="social" element={<SocialShareSettingsPage />} />
              <Route path="social-login" element={<SocialLoginSettingsPage />} />
              <Route path="sms" element={<SmsGatewaySettingsPage />} />
              <Route path="email" element={<EmailProviderSettingsPage />} />
              <Route path="payment" element={<PaymentSettingsPage />} />
              <Route path="shipping" element={<ShippingSettingsPage />} />
              <Route path="analytics" element={<AnalyticsSettingsPage />} />
              <Route path="pixels" element={<PixelsSettingsPage />} />
              <Route path="history" element={<HistorySettingsPage />} />
              <Route path="*" element={<Navigate to="identity" replace />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={STORE_ROLES} />}>
            <Route path="stores" element={<StoresPage />} />
            <Route path="stores/new" element={<StoreCreatePage />} />
            <Route path="stores/:slug" element={<StoreEditPage />} />
            <Route path="shops" element={<StoresPage />} />
            <Route path="shops/new" element={<StoreCreatePage />} />
            <Route path="shops/:slug" element={<StoreEditPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={PRODUCT_ROLES} />}>
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/new" element={<ProductCreatePage />} />
            <Route path="products/:id" element={<ProductEditPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={TAXONOMY_VIEW_ROLES} />}>
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="brands" element={<BrandsPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={TAXONOMY_MANAGE_ROLES} />}>
            <Route path="categories/new" element={<CategoryCreatePage />} />
            <Route path="categories/:id" element={<CategoryEditPage />} />
            <Route path="brands/new" element={<BrandCreatePage />} />
            <Route path="brands/:id" element={<BrandEditPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={WORKSPACE_ROLES.super_admin} />}>
            <Route
              path="super-admin"
              element={<RolePage role="Super Admin" />}
            />
          </Route>

          <Route element={<ProtectedRoute roles={WORKSPACE_ROLES.admin} />}>
            <Route path="admin" element={<RolePage role="Admin" />} />
          </Route>

          <Route element={<ProtectedRoute roles={WORKSPACE_ROLES.moderator} />}>
            <Route path="moderator" element={<RolePage role="Moderator" />} />
          </Route>

          <Route element={<ProtectedRoute roles={WORKSPACE_ROLES.vendor} />}>
            <Route path="vendor" element={<RolePage role="Vendor" />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<RoleHomeRedirect />} />
    </Routes>
  );
}
