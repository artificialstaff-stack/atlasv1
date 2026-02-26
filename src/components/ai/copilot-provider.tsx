"use client";

import { ReactNode } from "react";
import { CopilotKit } from "@copilotkit/react-core";

/**
 * CopilotKit Provider — tüm AI özelliklerini saran wrapper
 * Client layout'a eklenir, runtime endpoint'e bağlanır
 */
export function CopilotProvider({ children }: { children: ReactNode }) {
  return (
    <CopilotKit runtimeUrl="/api/copilot">
      {children}
    </CopilotKit>
  );
}
