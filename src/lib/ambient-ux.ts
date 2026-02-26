/**
 * ─── Atlas Ambient UX — Animasyon Yardımcıları ───
 * 
 * "Anlamlı Hareket" (Meaningful Motion) prensibi:
 * Animasyonlar sadece görsel süsleme değil, sistemin kullanıcıyla
 * iletişim kurduğu ana dil haline gelir.
 * 
 * Durum değişiklikleri, loading spinnerlar yerine fiziksel olarak
 * doğal hissettiren geçişlerle açıklanır.
 */

import { animation } from "@/lib/design-tokens";

// ─── FRAMER MOTION UYUMLU VARIANTS ───
// Not: Animasyon kütüphanesi sonradan eklenebilir (GSAP/Framer Motion)

/**
 * Sayfa geçiş animasyonu — yumuşak fade + slide
 */
export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: {
    duration: 0.3,
    ease: [0.4, 0, 0.2, 1] as const,
  },
} as const;

/**
 * Kart hover efekti — yumuşak yükselme
 */
export const cardHover = {
  initial: { scale: 1, y: 0 },
  hover: { scale: 1.01, y: -2 },
  transition: {
    duration: 0.2,
    ease: [0.4, 0, 0.2, 1] as const,
  },
} as const;

/**
 * Staggered list — öğelerin sırayla görünmesi
 */
export const staggeredList = {
  container: {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  },
  item: {
    initial: { opacity: 0, y: 10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.25,
        ease: [0.4, 0, 0.2, 1] as const,
      },
    },
  },
} as const;

/**
 * Modal / Dialog geçişi
 */
export const modalTransition = {
  overlay: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  },
  content: {
    initial: { opacity: 0, scale: 0.96, y: 8 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.96, y: 8 },
    transition: {
      duration: 0.25,
      ease: [0.34, 1.56, 0.64, 1] as const, // spring
    },
  },
} as const;

/**
 * Durum değişikliği animasyonu — "Bekliyor" → "Onaylandı" geçişi
 * Dark Pattern yok: Yapay gecikme kullanılmaz
 */
export const statusTransition = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  transition: {
    duration: 0.3,
    ease: [0.34, 1.56, 0.64, 1] as const,
  },
} as const;

/**
 * Sayı değişim animasyonu (KPI kartlarında)
 */
export const numberChange = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
  transition: {
    duration: 0.2,
    ease: [0.4, 0, 0.2, 1] as const,
  },
} as const;

// ─── CSS ANİMASYON YARDIMCILARI ───

/**
 * CSS geçiş stringi oluştur — tasarım tokenlarıyla uyumlu
 */
export function createTransition(
  properties: string[] = ["all"],
  duration: keyof typeof animation.duration = "normal",
  easing: keyof typeof animation.easing = "default"
): string {
  return properties
    .map(
      (prop) =>
        `${prop} ${animation.duration[duration]} ${animation.easing[easing]}`
    )
    .join(", ");
}

/**
 * Tailwind uyumlu CSS class oluştur
 */
export const ambientClasses = {
  // Yumuşak geçiş
  transition: "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
  // Hover yükselme
  hoverLift: "hover:-translate-y-0.5 hover:shadow-md transition-all duration-200",
  // Kart hover
  cardHover: "hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-200",
  // Focus ring
  focusRing: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  // Skeleton pulse
  skeleton: "animate-pulse bg-muted rounded",
  // Fade in
  fadeIn: "animate-in fade-in-0 duration-300",
  // Slide up
  slideUp: "animate-in slide-in-from-bottom-2 duration-300",
} as const;

// ─── MEKANSAL ANİMASYON YARDIMCILARI ───

/**
 * Harita katmanı geçişleri — GPU render ile senkronize
 */
export const spatialAnimations = {
  layerFadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
    duration: 500, // ms — WebGPU frame budget'a uyumlu
    easing: "ease-out",
  },
  viewportTransition: {
    duration: 800,
    easing: "ease-in-out",
  },
  elevationRise: {
    from: { elevation: 0 },
    to: { elevation: 1 },
    duration: 600,
    easing: "ease-out",
  },
} as const;
