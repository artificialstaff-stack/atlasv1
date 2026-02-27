/**
 * ─── Atlas Platform — RoleGate Component ───
 * Client-side permission-based rendering.
 * Wraps children that should only render for specific roles/permissions.
 */
"use client";

import type { ReactNode } from "react";
import type { UserRole } from "@/types/enums";
import {
  hasPermission,
  hasAnyPermission,
  isRoleAtLeast,
  type Permission,
} from "@/lib/rbac/permissions";

interface RoleGateProps {
  children: ReactNode;
  /** Current user's role */
  role: UserRole;
  /** Require a specific permission */
  permission?: Permission;
  /** Require any of these permissions (OR) */
  anyPermission?: Permission[];
  /** Require at least this role level */
  minRole?: UserRole;
  /** What to render if access is denied */
  fallback?: ReactNode;
}

/**
 * Conditionally renders children based on role/permission.
 *
 * @example
 * <RoleGate role={userRole} permission="users.manage_roles">
 *   <AdminOnlyPanel />
 * </RoleGate>
 *
 * @example
 * <RoleGate role={userRole} minRole="moderator" fallback={<p>No access</p>}>
 *   <ModeratorPanel />
 * </RoleGate>
 */
export function RoleGate({
  children,
  role,
  permission,
  anyPermission,
  minRole,
  fallback = null,
}: RoleGateProps) {
  let allowed = true;

  if (permission) {
    allowed = hasPermission(role, permission);
  }

  if (allowed && anyPermission) {
    allowed = hasAnyPermission(role, anyPermission);
  }

  if (allowed && minRole) {
    allowed = isRoleAtLeast(role, minRole);
  }

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
