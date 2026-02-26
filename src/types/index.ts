// =============================================================================
// ATLAS PLATFORM — Genel TypeScript Arayüzleri
// =============================================================================

export type { Database, Tables, InsertTables, UpdateTables } from "./database";
export * from "./enums";

/**
 * Server Action yanıt tipi
 */
export type ActionResponse<T = void> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

/**
 * Sayfalanmış veri tipi
 */
export interface PaginatedData<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * JWT app_metadata yapısı
 */
export interface AppMetadata {
  user_role: string;
}

/**
 * Kullanıcı profili (users tablosu + role)
 */
export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company_name: string;
  tax_id: string | null;
  phone: string | null;
  onboarding_status: string;
  role: string;
}

/**
 * Breadcrumb öğesi
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}
