/**
 * Atlas Platform — Storage Service
 * Merkezi dosya yönetimi: upload, download, delete, list
 * Supabase Storage üzerinde çalışır.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Constants ──────────────────────────────────────────
export const BUCKETS = {
  CUSTOMER_DOCS: "customer-documents",
  ADMIN_UPLOADS: "admin-uploads",
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

export const MAX_FILE_SIZE_MB = 25;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
] as const;

// ─── Types ──────────────────────────────────────────────
export interface StorageFile {
  name: string;
  path: string;
  size: number;
  mimeType: string;
  url: string;
  createdAt: string;
  category: FileCategory;
}

export type FileCategory = "legal" | "customs" | "invoice" | "product" | "report" | "general";

export interface UploadResult {
  success: boolean;
  file?: StorageFile;
  error?: string;
}

// ─── File Category Detection ────────────────────────────
const CATEGORY_PATTERNS: Record<FileCategory, RegExp> = {
  legal: /legal|contract|agreement|nda|mou|power.?of.?attorney/i,
  customs: /customs|gümrük|ithalat|ihracat|hs.?code|tariff/i,
  invoice: /invoice|fatura|receipt|payment|dekont/i,
  product: /product|ürün|catalog|katalog|spec/i,
  report: /report|rapor|analiz|analysis|summary/i,
  general: /.*/,
};

export function detectFileCategory(filename: string): FileCategory {
  for (const [category, pattern] of Object.entries(CATEGORY_PATTERNS)) {
    if (category === "general") continue;
    if (pattern.test(filename)) return category as FileCategory;
  }
  return "general";
}

// ─── File Type Helpers ──────────────────────────────────
export function getFileIcon(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const iconMap: Record<string, string> = {
    pdf: "📄",
    xlsx: "📊", xls: "📊", csv: "📊",
    doc: "📝", docx: "📝",
    jpg: "🖼️", jpeg: "🖼️", png: "🖼️", webp: "🖼️",
    zip: "📦",
  };
  return iconMap[ext] || "📁";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `Dosya boyutu ${MAX_FILE_SIZE_MB}MB'ı aşamaz. Mevcut: ${formatFileSize(file.size)}` };
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return { valid: false, error: `Desteklenmeyen dosya formatı: ${file.type || "bilinmiyor"}` };
  }
  return { valid: true };
}

// ─── Server-side Storage Operations ─────────────────────
export async function listUserFiles(
  supabase: SupabaseClient,
  userId: string,
  bucket: BucketName = BUCKETS.CUSTOMER_DOCS,
): Promise<StorageFile[]> {
  const { data: files, error } = await supabase.storage
    .from(bucket)
    .list(userId, { limit: 100, sortBy: { column: "created_at", order: "desc" } });

  if (error || !files) return [];

  return files
    .filter((f) => f.name !== ".emptyFolderPlaceholder")
    .map((f) => ({
      name: f.name,
      path: `${userId}/${f.name}`,
      size: f.metadata?.size || 0,
      mimeType: f.metadata?.mimetype || "application/octet-stream",
      url: supabase.storage.from(bucket).getPublicUrl(`${userId}/${f.name}`).data.publicUrl,
      createdAt: f.created_at || new Date().toISOString(),
      category: detectFileCategory(f.name),
    }));
}

export async function uploadFile(
  supabase: SupabaseClient,
  userId: string,
  file: File,
  bucket: BucketName = BUCKETS.CUSTOMER_DOCS,
  subfolder?: string,
): Promise<UploadResult> {
  const validation = validateFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Sanitize filename
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const path = subfolder
    ? `${userId}/${subfolder}/${timestamp}_${safeName}`
    : `${userId}/${timestamp}_${safeName}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);

  return {
    success: true,
    file: {
      name: safeName,
      path,
      size: file.size,
      mimeType: file.type,
      url: urlData.publicUrl,
      createdAt: new Date().toISOString(),
      category: detectFileCategory(safeName),
    },
  };
}

export async function deleteFile(
  supabase: SupabaseClient,
  path: string,
  bucket: BucketName = BUCKETS.CUSTOMER_DOCS,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getSignedDownloadUrl(
  supabase: SupabaseClient,
  path: string,
  bucket: BucketName = BUCKETS.CUSTOMER_DOCS,
  expiresIn = 3600,
): Promise<{ url?: string; error?: string }> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) return { error: error.message };
  return { url: data.signedUrl };
}

export async function getStorageStats(
  supabase: SupabaseClient,
  userId: string,
  bucket: BucketName = BUCKETS.CUSTOMER_DOCS,
): Promise<{ totalFiles: number; totalSize: number; categories: Record<FileCategory, number> }> {
  const files = await listUserFiles(supabase, userId, bucket);
  const categories: Record<FileCategory, number> = {
    legal: 0, customs: 0, invoice: 0, product: 0, report: 0, general: 0,
  };
  for (const f of files) {
    categories[f.category]++;
  }
  return {
    totalFiles: files.length,
    totalSize: files.reduce((acc, f) => acc + f.size, 0),
    categories,
  };
}
