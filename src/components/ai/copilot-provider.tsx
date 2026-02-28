"use client";

import { ReactNode } from "react";

/**
 * CopilotKit Provider placeholder
 * CopilotKit şu an devre dışı — agent'lar yapılandırılana kadar
 * sadece children'ı pass-through eder.
 *
 * Aktif etmek için:
 * 1. OPENAI_API_KEY ortam değişkenini ayarla
 * 2. /api/copilot route'unda agent kaydet
 * 3. Bu dosyada CopilotKit provider'ı etkinleştir
 */
export function CopilotProvider({ children }: { children: ReactNode }) {
  // CopilotKit devre dışı — agent yapılandırması gerekli
  // Aktif edildiğinde: <CopilotKit runtimeUrl="/api/copilot">{children}</CopilotKit>
  return <>{children}</>;
}
