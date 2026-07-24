"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
};

export function Pagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems <= pageSize) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-card border border-border-card bg-white px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-center text-[13px] font-semibold text-muted-2 sm:text-left">
        {start}-{end} / {totalItems}
      </div>
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev}
          aria-label="Onceki sayfa"
          className="inline-flex h-10 w-10 items-center justify-center rounded-field border border-border-input bg-white text-ink-2 transition-colors hover:bg-panel disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <div className="min-w-24 text-center text-[13px] font-bold text-ink-2">
          {page} / {totalPages}
        </div>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
          aria-label="Sonraki sayfa"
          className="inline-flex h-10 w-10 items-center justify-center rounded-field border border-border-input bg-white text-ink-2 transition-colors hover:bg-panel disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
