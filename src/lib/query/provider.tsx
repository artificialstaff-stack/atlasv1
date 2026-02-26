"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

/**
 * TanStack React Query Provider — Production Configuration
 *
 * staleTime: 60 saniye — veri "taze" sayılır, gereksiz refetch önlenir
 * gcTime: 5 dakika — kullanılmayan cache temizlenir
 * refetchOnWindowFocus: false — pencere odağında otomatik refetch kapalı
 * Global error handler: Mutation hatalarını otomatik toast'lar
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // Don't retry on 4xx errors
              if (error instanceof Error && error.message?.includes("40")) {
                return false;
              }
              return failureCount < 2;
            },
            throwOnError: false,
          },
          mutations: {
            retry: 0,
            onError: (error) => {
              // Global mutation error handler
              const message =
                error instanceof Error ? error.message : "Bir hata oluştu";
              toast.error(message);
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
