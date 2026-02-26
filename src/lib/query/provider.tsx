"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";

/**
 * TanStack React Query Provider
 *
 * staleTime: 60 saniye — veri "taze" sayılır, gereksiz refetch önlenir
 * gcTime: 5 dakika — kullanılmayan cache temizlenir
 * refetchOnWindowFocus: false — pencere odağında otomatik refetch kapalı
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 60 saniye
            gcTime: 5 * 60 * 1000, // 5 dakika
            refetchOnWindowFocus: false,
            retry: 1,
          },
          mutations: {
            retry: 0,
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
