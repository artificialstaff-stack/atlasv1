/**
 * Atlas Platform — Universal Search & Filter Hook
 * Debounced arama + çoklu filtre + sıralama + URL senkronizasyonu.
 */
"use client";

import { useState, useCallback, useMemo, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

// ─── Types ──────────────────────────────────────────────
export interface FilterConfig {
  key: string;
  label: string;
  type: "select" | "multiselect" | "date" | "daterange" | "boolean";
  options?: { value: string; label: string }[];
}

export interface SortConfig {
  key: string;
  direction: "asc" | "desc";
}

interface UseSearchFilterOptions {
  /** Filtreler URL'de senkronize edilsin mi? */
  syncUrl?: boolean;
  /** Debounce süresi (ms) */
  debounceMs?: number;
  /** Varsayılan sıralama */
  defaultSort?: SortConfig;
}

interface SearchFilterState {
  query: string;
  filters: Record<string, string | string[]>;
  sort: SortConfig;
  page: number;
}

// ─── Hook ───────────────────────────────────────────────
export function useSearchFilter(options: UseSearchFilterOptions = {}) {
  const { syncUrl = true, defaultSort = { key: "created_at", direction: "desc" } } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Parse initial state from URL
  const initialState: SearchFilterState = useMemo(() => {
    if (!syncUrl) {
      return { query: "", filters: {}, sort: defaultSort, page: 1 };
    }
    const q = searchParams.get("q") || "";
    const sortKey = searchParams.get("sortBy") || defaultSort.key;
    const sortDir = (searchParams.get("sortDir") || defaultSort.direction) as "asc" | "desc";
    const page = parseInt(searchParams.get("page") || "1", 10);

    // Extract filters (any param not in reserved set)
    const reserved = new Set(["q", "sortBy", "sortDir", "page"]);
    const filters: Record<string, string | string[]> = {};
    searchParams.forEach((value, key) => {
      if (!reserved.has(key)) {
        const existing = filters[key];
        if (existing) {
          filters[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
        } else {
          filters[key] = value;
        }
      }
    });

    return { query: q, filters, sort: { key: sortKey, direction: sortDir }, page };
  }, [searchParams, syncUrl, defaultSort]);

  const [state, setState] = useState<SearchFilterState>(initialState);

  // Update URL when state changes
  const syncToUrl = useCallback(
    (newState: SearchFilterState) => {
      if (!syncUrl) return;
      startTransition(() => {
        const params = new URLSearchParams();
        if (newState.query) params.set("q", newState.query);
        if (newState.sort.key !== defaultSort.key) params.set("sortBy", newState.sort.key);
        if (newState.sort.direction !== defaultSort.direction) params.set("sortDir", newState.sort.direction);
        if (newState.page > 1) params.set("page", String(newState.page));

        for (const [key, value] of Object.entries(newState.filters)) {
          if (Array.isArray(value)) {
            for (const v of value) params.append(key, v);
          } else if (value) {
            params.set(key, value);
          }
        }

        const qs = params.toString();
        router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
      });
    },
    [syncUrl, pathname, router, defaultSort],
  );

  // ─── Actions ────────────────────────────────────────────
  const setQuery = useCallback(
    (query: string) => {
      const next = { ...state, query, page: 1 };
      setState(next);
      syncToUrl(next);
    },
    [state, syncToUrl],
  );

  const setFilter = useCallback(
    (key: string, value: string | string[] | undefined) => {
      const newFilters = { ...state.filters };
      if (value === undefined || (Array.isArray(value) && value.length === 0) || value === "") {
        delete newFilters[key];
      } else {
        newFilters[key] = value;
      }
      const next = { ...state, filters: newFilters, page: 1 };
      setState(next);
      syncToUrl(next);
    },
    [state, syncToUrl],
  );

  const setSort = useCallback(
    (sort: SortConfig) => {
      const next = { ...state, sort };
      setState(next);
      syncToUrl(next);
    },
    [state, syncToUrl],
  );

  const setPage = useCallback(
    (page: number) => {
      const next = { ...state, page };
      setState(next);
      syncToUrl(next);
    },
    [state, syncToUrl],
  );

  const clearAll = useCallback(() => {
    const next = { query: "", filters: {}, sort: defaultSort, page: 1 };
    setState(next);
    syncToUrl(next);
  }, [defaultSort, syncToUrl]);

  const hasActiveFilters = useMemo(
    () => state.query !== "" || Object.keys(state.filters).length > 0,
    [state],
  );

  return {
    ...state,
    isPending,
    hasActiveFilters,
    setQuery,
    setFilter,
    setSort,
    setPage,
    clearAll,
  };
}

// ─── Client-side filter helper ──────────────────────────
export function filterItems<T>(
  items: T[],
  query: string,
  searchFields: (keyof T)[],
  filters: Record<string, string | string[]>,
  filterFields: Record<string, keyof T>,
): T[] {
  let result = items;

  // Text search
  if (query) {
    const lowerQuery = query.toLowerCase();
    result = result.filter((item) =>
      searchFields.some((field) => {
        const value = item[field];
        return value != null && String(value).toLowerCase().includes(lowerQuery);
      }),
    );
  }

  // Filter by field values
  for (const [filterKey, filterValue] of Object.entries(filters)) {
    const field = filterFields[filterKey];
    if (!field) continue;

    if (Array.isArray(filterValue)) {
      result = result.filter((item) => filterValue.includes(String(item[field])));
    } else {
      result = result.filter((item) => String(item[field]) === filterValue);
    }
  }

  return result;
}

// ─── Supabase query builder helper ──────────────────────
export function applySearchFilters<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  params: {
    search?: string;
    searchColumns?: string[];
    filters?: Record<string, string | string[]>;
    sort?: SortConfig;
    page?: number;
    pageSize?: number;
  },
) {
  let q = query;

  // Text search — use Supabase ilike on each column with OR
  if (params.search && params.searchColumns?.length) {
    const orClauses = params.searchColumns.map((col) => `${col}.ilike.%${params.search}%`).join(",");
    q = q.or(orClauses);
  }

  // Exact match filters
  if (params.filters) {
    for (const [key, value] of Object.entries(params.filters)) {
      if (Array.isArray(value)) {
        q = q.in(key, value);
      } else if (value) {
        q = q.eq(key, value);
      }
    }
  }

  // Sort
  if (params.sort) {
    q = q.order(params.sort.key, { ascending: params.sort.direction === "asc" });
  }

  // Pagination
  if (params.page && params.pageSize) {
    const from = (params.page - 1) * params.pageSize;
    q = q.range(from, from + params.pageSize - 1);
  }

  return q;
}
