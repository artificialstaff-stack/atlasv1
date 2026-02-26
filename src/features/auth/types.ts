import type { UserRole } from "@/types/enums";

/**
 * Auth Feature Types
 */

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  metadata: Record<string, unknown>;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  companyName: string;
  phone?: string;
  inviteToken: string;
}
