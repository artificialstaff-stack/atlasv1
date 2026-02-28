"use client";

/**
 * SafeAIComponents — AI bileşenleri wrapper
 *
 * CopilotKit şu an devre dışı (agent yapılandırması gerekli).
 * Bu nedenle CopilotActions ve AIChatPanel render edilmiyor.
 *
 * Aktif etmek için:
 * 1. copilot-provider.tsx'de CopilotKit provider'ı aç
 * 2. /api/copilot'ta agent kaydet
 * 3. Bu dosyada bileşenleri yeniden etkinleştir
 */
export function SafeAIComponents() {
  // CopilotKit devre dışı — agent yapılandırılana kadar render etme
  // Aktif: <AIErrorBoundary><CopilotActions /><AIChatPanel /></AIErrorBoundary>
  return null;
}
