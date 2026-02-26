"use client";

import { ErrorBoundary } from "@/components/shared/error-boundary";

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container mx-auto px-4 py-20">
      <ErrorBoundary error={error} reset={reset} />
    </div>
  );
}
