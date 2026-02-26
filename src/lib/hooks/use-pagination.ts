"use client";

import { useState, useCallback, useMemo } from "react";

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface UsePaginationReturn {
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  hasNext: boolean;
  hasPrev: boolean;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageSize: (size: number) => void;
  setTotal: (total: number) => void;
  range: { from: number; to: number };
}

/**
 * Pagination hook — Supabase range() ile uyumlu
 *
 * Kullanım:
 * const pagination = usePagination({ pageSize: 20 });
 * const { data } = useQuery({
 *   queryFn: () => supabase.from("table").select("*", { count: "exact" })
 *     .range(pagination.range.from, pagination.range.to),
 * });
 * // data.length=pageSize, total=count
 */
export function usePagination(options?: {
  initialPage?: number;
  pageSize?: number;
}): UsePaginationReturn {
  const [page, setPageState] = useState(options?.initialPage ?? 1);
  const [pageSize, setPageSizeState] = useState(options?.pageSize ?? 20);
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const setPage = useCallback(
    (p: number) => {
      setPageState(Math.max(1, Math.min(p, totalPages)));
    },
    [totalPages]
  );

  const nextPage = useCallback(() => {
    if (hasNext) setPageState((p) => p + 1);
  }, [hasNext]);

  const prevPage = useCallback(() => {
    if (hasPrev) setPageState((p) => p - 1);
  }, [hasPrev]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageState(1); // sayfa boyutu değişince ilk sayfaya dön
  }, []);

  return {
    page,
    pageSize,
    totalPages,
    total,
    from,
    to,
    hasNext,
    hasPrev,
    setPage,
    nextPage,
    prevPage,
    setPageSize,
    setTotal,
    range: { from, to },
  };
}
