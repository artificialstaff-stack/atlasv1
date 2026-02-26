/**
 * ─── Atlas Design Token Sistemi ───
 * 
 * Atlas 2026 CTO Referans Mimarisi - "Zero Drift" Tasarım Tokenları
 * 
 * Bu dosya, Figma tasarım tokenlarını TypeScript'e aktarır.
 * Bileşen kataloğu (A2UI) ve AI ajanları bu tokenları tüketir.
 * 
 * Felsefe: "Zero Drift" — Tasarım ile kod arasında sıfır sapma.
 */

// ─── RENK PALETİ ───

export const colors = {
  // Ana marka renkleri
  brand: {
    primary: "hsl(224, 100%, 60%)",      // #4f7cff — Ana mavi
    secondary: "hsl(256, 94%, 68%)",      // #7c5cff — Mor
    accent: "hsl(166, 100%, 42%)",        // #00d4b4 — Turkuaz
    danger: "hsl(0, 100%, 71%)",          // #ff6b6b — Kırmızı
    warning: "hsl(42, 100%, 70%)",        // #ffd166 — Sarı
  },

  // Semantic renkler
  semantic: {
    success: "hsl(166, 100%, 42%)",       // Zümrüt yeşil — onay
    error: "hsl(0, 100%, 71%)",           // Kırmızı — hata
    warning: "hsl(42, 100%, 70%)",        // Sarı — dikkat
    info: "hsl(224, 100%, 60%)",          // Mavi — bilgi
    // CTO Raporu: Calm UX semantik vurgular
    amber: "hsl(38, 100%, 55%)",          // Amber — gümrükte bekleme
    emerald: "hsl(155, 75%, 45%)",        // Zümrüt — LLC/EIN onayı 
    crisis: "hsl(0, 85%, 55%)",           // Kriz kırmızısı — acil durum
    pending: "hsl(38, 100%, 65%)",        // Bekleyen süreç — soft amber
    approved: "hsl(155, 75%, 50%)",       // Onaylanmış süreç — yeşil
    inProgress: "hsl(224, 80%, 60%)",     // Devam eden — mavi
  },

  // Mekansal veri görselleştirme renk skalası
  spatial: {
    heatLow: "hsl(224, 100%, 60%)",       // Soğuk — Mavi
    heatMid: "hsl(42, 100%, 70%)",        // Orta — Sarı
    heatHigh: "hsl(0, 100%, 71%)",        // Sıcak — Kırmızı
    elevation: "hsl(166, 100%, 42%)",     // Yükseklik — Turkuaz
    grid: "hsl(256, 94%, 68%)",           // Grid çizgisi — Mor
  },

  // Grafik renkleri (5 aşamalı)
  chart: [
    "hsl(224, 100%, 60%)",
    "hsl(256, 94%, 68%)",
    "hsl(166, 100%, 42%)",
    "hsl(0, 100%, 71%)",
    "hsl(42, 100%, 70%)",
  ],
} as const;

// ─── TİPOGRAFİ ───

export const typography = {
  fontFamily: {
    sans: "var(--font-geist-sans), -apple-system, 'Inter', 'Segoe UI', sans-serif",
    mono: "var(--font-geist-mono), 'Fira Code', monospace",
  },
  fontSize: {
    xs: "0.75rem",      // 12px
    sm: "0.8125rem",    // 13px
    base: "0.875rem",   // 14px
    md: "1rem",         // 16px
    lg: "1.125rem",     // 18px
    xl: "1.375rem",     // 22px
    "2xl": "1.625rem",  // 26px
    "3xl": "2.75rem",   // 44px — hero
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
    black: "900",
  },
  lineHeight: {
    tight: "1.15",
    snug: "1.3",
    normal: "1.5",
    relaxed: "1.7",
  },
  letterSpacing: {
    tighter: "-1.5px",
    tight: "-0.5px",
    normal: "0",
    wide: "1px",
    wider: "1.5px",
  },
} as const;

// ─── ALAN & BOŞLUK ───

export const spacing = {
  px: "1px",
  0: "0",
  0.5: "0.125rem",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
  20: "5rem",
  24: "6rem",
} as const;

// ─── YUVARLAMA (BORDER RADIUS) ───

export const borderRadius = {
  none: "0",
  sm: "6px",
  md: "8px",
  lg: "10px",
  xl: "12px",
  "2xl": "14px",
  "3xl": "16px",
  full: "9999px",
} as const;

// ─── ANİMASYON ───
// Ambient UX felsefesi: "Anlamlı Hareket" (Meaningful Motion)

export const animation = {
  duration: {
    instant: "50ms",
    fast: "150ms",
    normal: "250ms",
    slow: "400ms",
    slower: "600ms",
  },
  easing: {
    // Fiziksel olarak doğal hissettiren geçişler
    default: "cubic-bezier(0.4, 0, 0.2, 1)",
    in: "cubic-bezier(0.4, 0, 1, 1)",
    out: "cubic-bezier(0, 0, 0.2, 1)",
    inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
  },
} as const;

// ─── GÖLGELENDİRME ───

export const shadows = {
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
  glow: {
    blue: "0 0 20px rgba(79, 124, 255, 0.3)",
    purple: "0 0 20px rgba(124, 92, 255, 0.3)",
    teal: "0 0 20px rgba(0, 212, 180, 0.3)",
  },
} as const;

// ─── KIRILMA NOKTALARI (BREAKPOINTS) ───

export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

// ─── Z-İNDEX KATMANLARI ───

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  popover: 50,
  toast: 60,
  tooltip: 70,
  mapWidgets: 80,
  sidebar: 90,
  header: 100,
} as const;

// ─── MEKANSAL VERİ GÖRSEL ŞEMALARİ ───

export const spatialTokens = {
  // WebGPU render hedefleri
  targetFPS: 60,
  maxDataPoints: 1_000_000,
  
  // A5 DGGS Beşgen sistemi
  dggs: {
    system: "A5" as const,
    cellIdType: "bigint" as const,
    rootCells: 1,
    maxResolution: 22,
  },
  
  // Harita varsayılanları
  map: {
    defaultCenter: [35.2433, 38.9637] as [number, number], // Türkiye merkezi
    defaultZoom: 6,
    minZoom: 2,
    maxZoom: 22,
    globeView: true,
  },
} as const;

// ─── TOKEN İHRACATI ───

export const designTokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  animation,
  shadows,
  breakpoints,
  zIndex,
  spatialTokens,
} as const;

export type DesignTokens = typeof designTokens;
