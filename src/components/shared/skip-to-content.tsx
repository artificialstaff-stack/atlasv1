"use client";

/**
 * Skip to Content — Accessibility (a11y)
 *
 * Keyboard-only users can skip navigation and jump to main content.
 * Only visible on focus (Tab key).
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
    >
      Ana içeriğe geç
    </a>
  );
}
