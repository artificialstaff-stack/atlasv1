import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

/**
 * Tailwind CSS sınıf birleştirme yardımcısı
 * clsx (koşullu sınıflar) + tailwind-merge (çakışma çözümü)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Para birimi formatlama (USD)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/**
 * Tarih formatlama (Türkçe)
 */
export function formatDate(date: string | Date): string {
  return format(new Date(date), "dd MMM yyyy", { locale: tr });
}

/**
 * Tarih formatlama — zaman ile birlikte
 */
export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "dd MMM yyyy HH:mm", { locale: tr });
}

/**
 * Görece zaman gösterimi ("2 saat önce" vb.)
 */
export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: tr });
}

/**
 * UUID kısaltma (tablolaarda gösterim)
 */
export function shortenUUID(uuid: string): string {
  return uuid.slice(0, 8);
}

/**
 * Durum badge renklendirmesi için yardımcı
 */
export function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    // Genel pozitif durumlar
    active: "default",
    completed: "default",
    cleared: "default",
    delivered: "default",
    resolved: "default",
    accepted: "default",
    converted: "default",
    // Devam eden durumlar
    in_progress: "secondary",
    processing: "secondary",
    packing: "secondary",
    investigating: "secondary",
    onboarding: "secondary",
    verifying: "secondary",
    contacted: "secondary",
    qualified: "secondary",
    // Bekleyen/nötr durumlar
    pending: "outline",
    new: "outline",
    open: "outline",
    received: "outline",
    lead: "outline",
    waiting_customer: "outline",
    // Negatif durumlar
    cancelled: "destructive",
    overdue: "destructive",
    suspended: "destructive",
    rejected: "destructive",
    blocked: "destructive",
    returned: "destructive",
    expired: "destructive",
    revoked: "destructive",
    closed: "destructive",
    shrinkage: "destructive",
  };
  return map[status] ?? "outline";
}
