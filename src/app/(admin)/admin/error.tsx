"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5">
      <div className="flex items-center gap-3 text-destructive">
        <AlertCircle className="h-8 w-8" />
        <h2 className="text-xl font-semibold">İşlem Hatası</h2>
      </div>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        {error.message || "Yönetim panelinde beklenmedik bir hata oluştu."}
      </p>
      {error.digest && (
        <code className="text-xs text-muted-foreground/50 bg-muted px-3 py-1 rounded-md">
          {error.digest}
        </code>
      )}
      <Button onClick={reset} variant="outline" size="sm" className="gap-2">
        <RefreshCw className="h-3.5 w-3.5" />
        Tekrar Dene
      </Button>
    </div>
  );
}
