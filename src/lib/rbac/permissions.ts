/**
 * ─── Atlas Platform — Advanced RBAC Permission System ───
 * Fine-grained permission matrix per role.
 * Server & client-side permission checks.
 */

import type { UserRole } from "@/types/enums";

// ─── Permission Definitions ─────────────────────────────
export const PERMISSIONS = {
  // Dashboard
  "dashboard.view": "View dashboard",
  "dashboard.admin_stats": "View admin statistics",

  // Users
  "users.list": "List all users",
  "users.view": "View user details",
  "users.create": "Create users",
  "users.update": "Update users",
  "users.delete": "Delete users",
  "users.manage_roles": "Manage user roles",

  // Products
  "products.list": "List products",
  "products.view": "View product details",
  "products.create": "Create products",
  "products.update": "Update products",
  "products.delete": "Delete products",

  // Orders
  "orders.list": "List orders",
  "orders.view": "View order details",
  "orders.create": "Create orders",
  "orders.update": "Update order status",
  "orders.cancel": "Cancel orders",

  // Billing / Invoices
  "billing.view": "View billing info",
  "billing.manage": "Manage invoices",
  "billing.confirm_payment": "Confirm payments",

  // Documents / Storage
  "documents.view": "View documents",
  "documents.upload": "Upload documents",
  "documents.delete": "Delete documents",

  // Support
  "tickets.list": "List support tickets",
  "tickets.create": "Create tickets",
  "tickets.update": "Update tickets",
  "tickets.assign": "Assign tickets",

  // Reports
  "reports.view": "View reports",
  "reports.generate": "Generate reports",
  "reports.export": "Export reports",

  // Audit
  "audit.view": "View audit logs",

  // Settings
  "settings.view": "View settings",
  "settings.update": "Update platform settings",

  // Inventory
  "inventory.view": "View inventory",
  "inventory.manage": "Manage inventory movements",

  // Webhooks
  "webhooks.manage": "Manage webhooks",
} as const;

export type Permission = keyof typeof PERMISSIONS;

// ─── Role → Permission Matrix ───────────────────────────
const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  super_admin: Object.keys(PERMISSIONS) as Permission[], // all permissions

  admin: [
    "dashboard.view",
    "dashboard.admin_stats",
    "users.list",
    "users.view",
    "users.create",
    "users.update",
    "products.list",
    "products.view",
    "products.create",
    "products.update",
    "products.delete",
    "orders.list",
    "orders.view",
    "orders.create",
    "orders.update",
    "orders.cancel",
    "billing.view",
    "billing.manage",
    "billing.confirm_payment",
    "documents.view",
    "documents.upload",
    "documents.delete",
    "tickets.list",
    "tickets.create",
    "tickets.update",
    "tickets.assign",
    "reports.view",
    "reports.generate",
    "reports.export",
    "audit.view",
    "settings.view",
    "settings.update",
    "inventory.view",
    "inventory.manage",
    "webhooks.manage",
  ],

  moderator: [
    "dashboard.view",
    "users.list",
    "users.view",
    "products.list",
    "products.view",
    "products.update",
    "orders.list",
    "orders.view",
    "orders.update",
    "billing.view",
    "documents.view",
    "documents.upload",
    "tickets.list",
    "tickets.create",
    "tickets.update",
    "tickets.assign",
    "reports.view",
    "inventory.view",
    "inventory.manage",
  ],

  viewer: [
    "dashboard.view",
    "products.list",
    "products.view",
    "orders.list",
    "orders.view",
    "billing.view",
    "documents.view",
    "tickets.list",
    "reports.view",
    "inventory.view",
  ],

  customer: [
    "dashboard.view",
    "products.list",
    "products.view",
    "products.create",
    "products.update",
    "orders.list",
    "orders.view",
    "orders.create",
    "billing.view",
    "documents.view",
    "documents.upload",
    "tickets.list",
    "tickets.create",
    "reports.view",
    "settings.view",
  ],
};

// ─── Permission Check Functions ─────────────────────────

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms?.includes(permission) ?? false;
}

/**
 * Check if a role has ALL of the specified permissions.
 */
export function hasAllPermissions(
  role: UserRole,
  permissions: Permission[]
): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Check if a role has ANY of the specified permissions.
 */
export function hasAnyPermission(
  role: UserRole,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Get all permissions for a role.
 */
export function getPermissions(role: UserRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Get all roles that have a specific permission.
 */
export function getRolesWithPermission(permission: Permission): UserRole[] {
  return (Object.entries(ROLE_PERMISSIONS) as [UserRole, readonly Permission[]][])
    .filter(([, perms]) => perms.includes(permission))
    .map(([role]) => role);
}

// ─── Role Hierarchy ─────────────────────────────────────
const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  admin: 80,
  moderator: 60,
  viewer: 40,
  customer: 20,
};

/**
 * Check if roleA has equal or higher privilege than roleB.
 */
export function isRoleAtLeast(roleA: UserRole, roleB: UserRole): boolean {
  return (ROLE_HIERARCHY[roleA] ?? 0) >= (ROLE_HIERARCHY[roleB] ?? 0);
}

/**
 * Get the numeric level of a role.
 */
export function getRoleLevel(role: UserRole): number {
  return ROLE_HIERARCHY[role] ?? 0;
}

// ─── Server-side Guard ──────────────────────────────────

/**
 * Server-side permission check — throws if denied.
 * Use in Server Components or Server Actions.
 */
export function requirePermission(
  role: UserRole,
  permission: Permission
): void {
  if (!hasPermission(role, permission)) {
    throw new Error(
      `Forbidden: role "${role}" lacks permission "${permission}"`
    );
  }
}

/**
 * Require multiple permissions — all must be satisfied.
 */
export function requirePermissions(
  role: UserRole,
  permissions: Permission[]
): void {
  for (const p of permissions) {
    if (!hasPermission(role, p)) {
      throw new Error(
        `Forbidden: role "${role}" lacks permission "${p}"`
      );
    }
  }
}
