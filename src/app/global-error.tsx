"use client";

import { Globe, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="tr">
      <body className="bg-background text-foreground">
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-destructive/10 blur-2xl w-32 h-32 -top-4 -left-4" />
            <Globe className="relative h-16 w-16 text-destructive" />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">
              Beklenmedik Hata
            </h1>
            <p className="text-muted-foreground max-w-md">
              {error.message ||
                "Bir şeyler ters gitti. Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin."}
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground/50 font-mono">
                Hata Kodu: {error.digest}
              </p>
            )}
          </div>
          <Button onClick={reset} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Tekrar Dene
          </Button>
        </div>
      </body>
    </html>
  );
}
