"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { UsePaginationReturn } from "@/lib/hooks/use-pagination";

interface DataTablePaginationProps {
  pagination: UsePaginationReturn;
  pageSizeOptions?: number[];
}

export function DataTablePagination({
  pagination,
  pageSizeOptions = [10, 20, 50, 100],
}: DataTablePaginationProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <p className="text-sm text-muted-foreground tabular-nums">
        {pagination.total > 0 ? (
          <>
            {pagination.from + 1}–{Math.min(pagination.to + 1, pagination.total)}{" "}
            / {pagination.total} kayıt
          </>
        ) : (
          "Kayıt bulunamadı"
        )}
      </p>

      <div className="flex items-center gap-3">
        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sayfa:</span>
          <Select
            value={String(pagination.pageSize)}
            onValueChange={(v) => pagination.setPageSize(Number(v))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page info */}
        <span className="text-sm text-muted-foreground tabular-nums min-w-[80px] text-center">
          {pagination.page} / {pagination.totalPages}
        </span>

        {/* Navigation buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => pagination.setPage(1)}
            disabled={!pagination.hasPrev}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={pagination.prevPage}
            disabled={!pagination.hasPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={pagination.nextPage}
            disabled={!pagination.hasNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => pagination.setPage(pagination.totalPages)}
            disabled={!pagination.hasNext}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
