import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePagination } from "@/lib/hooks/use-pagination";

describe("usePagination hook", () => {
  it("initializes with defaults", () => {
    const { result } = renderHook(() => usePagination());
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.total).toBe(0);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.hasNext).toBe(false);
    expect(result.current.hasPrev).toBe(false);
  });

  it("accepts custom initial values", () => {
    const { result } = renderHook(() =>
      usePagination({ initialPage: 2, pageSize: 10 })
    );
    expect(result.current.page).toBe(2);
    expect(result.current.pageSize).toBe(10);
  });

  it("computes from/to range correctly", () => {
    const { result } = renderHook(() => usePagination({ pageSize: 10 }));
    // Page 1 → from=0, to=9
    expect(result.current.from).toBe(0);
    expect(result.current.to).toBe(9);
    expect(result.current.range).toEqual({ from: 0, to: 9 });
  });

  it("setTotal updates totalPages", () => {
    const { result } = renderHook(() => usePagination({ pageSize: 10 }));
    act(() => result.current.setTotal(55));
    expect(result.current.total).toBe(55);
    expect(result.current.totalPages).toBe(6); // ceil(55/10)
    expect(result.current.hasNext).toBe(true);
  });

  it("nextPage increments page", () => {
    const { result } = renderHook(() => usePagination({ pageSize: 10 }));
    act(() => result.current.setTotal(30));
    act(() => result.current.nextPage());
    expect(result.current.page).toBe(2);
    expect(result.current.from).toBe(10);
    expect(result.current.to).toBe(19);
  });

  it("prevPage decrements page", () => {
    const { result } = renderHook(() =>
      usePagination({ initialPage: 3, pageSize: 10 })
    );
    act(() => result.current.setTotal(50));
    act(() => result.current.prevPage());
    expect(result.current.page).toBe(2);
  });

  it("prevents navigating below page 1", () => {
    const { result } = renderHook(() => usePagination());
    act(() => result.current.prevPage());
    expect(result.current.page).toBe(1);
  });

  it("prevents navigating past last page", () => {
    const { result } = renderHook(() => usePagination({ pageSize: 10 }));
    act(() => result.current.setTotal(15));
    // totalPages = 2
    act(() => result.current.setPage(2));
    act(() => result.current.nextPage());
    expect(result.current.page).toBe(2);
  });

  it("setPageSize resets to page 1", () => {
    const { result } = renderHook(() =>
      usePagination({ initialPage: 3, pageSize: 10 })
    );
    act(() => result.current.setTotal(100));
    act(() => result.current.setPageSize(50));
    expect(result.current.pageSize).toBe(50);
    expect(result.current.page).toBe(1);
    expect(result.current.totalPages).toBe(2);
  });

  it("setPage clamps to valid range", () => {
    const { result } = renderHook(() => usePagination({ pageSize: 10 }));
    act(() => result.current.setTotal(30)); // 3 pages
    act(() => result.current.setPage(99));
    expect(result.current.page).toBe(3);
    act(() => result.current.setPage(0));
    expect(result.current.page).toBe(1);
  });

  it("hasNext/hasPrev are correct on boundary pages", () => {
    const { result } = renderHook(() => usePagination({ pageSize: 10 }));
    act(() => result.current.setTotal(30));

    // Page 1: hasPrev=false, hasNext=true
    expect(result.current.hasPrev).toBe(false);
    expect(result.current.hasNext).toBe(true);

    // Page 2: both true
    act(() => result.current.nextPage());
    expect(result.current.hasPrev).toBe(true);
    expect(result.current.hasNext).toBe(true);

    // Page 3 (last): hasPrev=true, hasNext=false
    act(() => result.current.nextPage());
    expect(result.current.hasPrev).toBe(true);
    expect(result.current.hasNext).toBe(false);
  });
});
