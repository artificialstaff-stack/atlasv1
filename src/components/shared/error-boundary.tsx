"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Hata Sınırı Bileşeni — Next.js error.tsx dosyalarında kullanılır
 */
export function ErrorBoundaryFallback({ error, reset }: ErrorBoundaryFallbackProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-2 text-destructive">
        <AlertCircle className="h-8 w-8" />
        <h2 className="text-xl font-semibold">Bir hata oluştu</h2>
      </div>
      <p className="text-muted-foreground text-center max-w-md">
        {error.message || "Beklenmedik bir hata meydana geldi. Lütfen tekrar deneyin."}
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground/50 font-mono">
          Hata Kodu: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <Button onClick={reset} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Tekrar Dene
        </Button>
        <Button
          onClick={() => (window.location.href = "/panel/dashboard")}
          variant="ghost"
          size="sm"
          className="gap-2"
        >
          <Home className="h-3.5 w-3.5" />
          Panele Dön
        </Button>
      </div>
    </div>
  );
}

// Re-export for backwards compatibility
export { ErrorBoundaryFallback as ErrorBoundary };

// ─── Class-based Error Boundary ─────────────────────────
interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryWrapperState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Class-based error boundary wrapper for arbitrary component trees.
 * Use when you need to catch render errors in a subtree.
 *
 * @example
 * <ErrorBoundaryWrapper>
 *   <SomeDangerousComponent />
 * </ErrorBoundaryWrapper>
 */
export class ErrorBoundaryWrapper extends Component<
  ErrorBoundaryWrapperProps,
  ErrorBoundaryWrapperState
> {
  constructor(props: ErrorBoundaryWrapperProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    console.error("[ErrorBoundaryWrapper]", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <ErrorBoundaryFallback
          error={this.state.error ?? new Error("Unknown error")}
          reset={this.handleReset}
        />
      );
    }
    return this.props.children;
  }
}

