"use client";

import { Component, ReactNode, ErrorInfo, lazy, Suspense } from "react";

// Lazy imports — sadece render edildiğinde yüklenir
const LazyCopilotActions = lazy(() =>
  import("@/components/ai/copilot-actions").then((mod) => ({
    default: mod.CopilotActions,
  }))
);

const LazyAIChatPanel = lazy(() =>
  import("@/components/ai/ai-chat-panel").then((mod) => ({
    default: mod.AIChatPanel,
  }))
);

/**
 * AI Components Error Boundary — CopilotActions + AIChatPanel
 * Bu bileşenler çökerse sadece AI özellikleri devre dışı kalır,
 * ana sayfa etkilenmez.
 */
class AIErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn(
      "[AI Components] Hata yakalandı, AI devre dışı:",
      error.message,
      info.componentStack
    );
  }

  render() {
    if (this.state.hasError) {
      // AI çökerse hiçbir şey render etme — sayfa normal çalışsın
      return null;
    }
    return this.props.children;
  }
}

/**
 * Güvenli AI Components wrapper
 * CopilotActions + AIChatPanel çökerse null render eder
 */
export function SafeAIComponents() {
  return (
    <AIErrorBoundary>
      <Suspense fallback={null}>
        <LazyCopilotActions />
        <LazyAIChatPanel />
      </Suspense>
    </AIErrorBoundary>
  );
}
