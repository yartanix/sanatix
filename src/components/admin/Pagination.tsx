"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  isRTL?: boolean;
}

export default function Pagination({
  page,
  pages,
  total,
  limit,
  onPageChange,
  isRTL,
}: PaginationProps) {
  if (pages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);

  const pageNumbers: (number | "...")[] = [];
  if (pages <= 7) {
    for (let i = 1; i <= pages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (page > 3) pageNumbers.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) {
      pageNumbers.push(i);
    }
    if (page < pages - 2) pageNumbers.push("...");
    pageNumbers.push(pages);
  }

  return (
    <div className="flex items-center justify-between mt-4 text-sm">
      <p className="text-[#2C2C2C]/50">
        {isRTL
          ? `عرض ${start}–${end} من ${total}`
          : `Showing ${start}–${end} of ${total}`}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-lg hover:bg-[#F0EDE4] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {isRTL ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        {pageNumbers.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 text-[#2C2C2C]/40">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={cn(
                "w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                p === page
                  ? "bg-[#1B4D4D] text-white"
                  : "hover:bg-[#F0EDE4] text-[#2C2C2C]/70"
              )}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === pages}
          className="p-1.5 rounded-lg hover:bg-[#F0EDE4] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {isRTL ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
    </div>
  );
}
