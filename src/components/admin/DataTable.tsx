"use client";

import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  sortBy?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  loading?: boolean;
  emptyMessage?: string;
  rowKey: (row: T) => string;
}

export default function DataTable<T>({
  columns,
  data,
  sortBy,
  sortDir,
  onSort,
  loading,
  emptyMessage = "No data found",
  rowKey,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-black/5 bg-[#F9F7F4]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-start text-xs font-semibold text-[#2C2C2C]/60 uppercase tracking-wide",
                  col.sortable && onSort && "cursor-pointer select-none hover:text-[#1B4D4D]",
                  col.className
                )}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <div className="flex items-center gap-1">
                  {col.header}
                  {col.sortable && onSort && (
                    <span className="text-[#2C2C2C]/30">
                      {sortBy === col.key ? (
                        sortDir === "asc" ? (
                          <ChevronUp size={13} className="text-[#1B4D4D]" />
                        ) : (
                          <ChevronDown size={13} className="text-[#1B4D4D]" />
                        )
                      ) : (
                        <ChevronsUpDown size={13} />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-black/5 last:border-0">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3.5">
                    <div className="h-4 bg-[#F0EDE4] rounded-lg animate-pulse w-3/4" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-[#2C2C2C]/40 text-sm"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-black/5 last:border-0 hover:bg-[#F9F7F4]/60 transition-colors"
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3.5 text-[#2C2C2C]", col.className)}>
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
