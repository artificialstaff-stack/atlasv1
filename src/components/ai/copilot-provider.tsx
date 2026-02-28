"use client";

import { ReactNode, Component, ErrorInfo } from "react";
import { CopilotKit } from "@copilotkit/react-core";

/**
 * CopilotKit Error Boundary — AI hatalarında uygulamayı korur
 * fallback prop ile CopilotKit OLMADAN children render edilir
 */
class CopilotErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn(
      "[CopilotKit] Hata yakalandı, AI chat devre dışı:",
      error.message,
      info.componentStack
    );
  }

  render() {
    if (this.state.hasError) {
      // AI hata verirse, children'ı CopilotKit OLMADAN render et
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * CopilotKit Provider — tüm AI özelliklerini saran wrapper
 * Error boundary ile sarılmıştır — AI çökerse uygulama etkilenmez
 */
export function CopilotProvider({ children }: { children: ReactNode }) {
  return (
    <CopilotErrorBoundary fallback={children}>
      <CopilotKit runtimeUrl="/api/copilot">
        {children}
      </CopilotKit>
    </CopilotErrorBoundary>
  );
}
