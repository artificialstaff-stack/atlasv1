"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Hata Sınırı Bileşeni
 * Next.js error.tsx dosyalarında kullanılır
 */
export function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-2 text-destructive">
        <AlertCircle className="h-8 w-8" />
        <h2 className="text-xl font-semibold">Bir hata oluştu</h2>
      </div>
      <p className="text-muted-foreground text-center max-w-md">
        {error.message || "Beklenmedik bir hata meydana geldi. Lütfen tekrar deneyin."}
      </p>
      <Button onClick={reset} variant="outline">
        Tekrar Dene
      </Button>
    </div>
  );
}
