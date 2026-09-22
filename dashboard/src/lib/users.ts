export type StaffRole = "super_admin" | "admin" | "moderator" | "vendor";

export type UserRole = StaffRole | "customer";

export type UserStatus =
  | "active"
  | "inactive"
  | "pending"
  | "suspended"
  | "banned";

export type StaffUser = {
  id: string;
  first_name: string;
  last_name: string;
  username?: string | null;
  email: string;
  phone?: string | null;
  role: StaffRole;
  status: string;
};

export type ManagedUser = {
  id: string;
  first_name: string;
  last_name: string;
  username?: string | null;
  email: string;
  phone?: string | null;
  role: UserRole;
  status: UserStatus;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export const USER_ROLES: UserRole[] = [
  "super_admin",
  "admin",
  "moderator",
  "vendor",
  "customer",
];

export const USER_STATUSES: UserStatus[] = [
  "active",
  "inactive",
  "pending",
  "suspended",
  "banned",
];

export const RESTRICT_STATUSES: Array<"inactive" | "suspended" | "banned"> = [
  "inactive",
  "suspended",
  "banned",
];
