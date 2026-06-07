"use client";

import { useState, useCallback } from "react";
import { useLocale } from "next-intl";
import { RefreshCw } from "lucide-react";
import DataTable, { Column } from "@/components/admin/DataTable";
import Pagination from "@/components/admin/Pagination";
import SearchBar from "@/components/admin/SearchBar";
import StatusBadge from "@/components/admin/StatusBadge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useAdminData } from "@/hooks/useAdminData";

interface AdminBooking {
  id: string;
  quantity: number;
  total_amount: number;
  currency: string;
  status: string;
  payment_ref: string | null;
  created_at: string;
  user_id: string;
  event_id: string;
  profiles: { full_name: string | null } | null;
  events: { title_ar: string; title_en: string; venue_city: string } | null;
  ticket_types: { name_ar: string; name_en: string } | null;
}

const BOOKING_STATUSES = ["pending", "confirmed", "cancelled", "refunded"];

export default function AdminBookingsPage() {
  const locale = useLocale();
  const isRTL = locale === "ar";

  const [page, setPage]         = useState(1);
  const [q, setQ]               = useState("");
  const [status, setStatus]     = useState("");
  const [sortBy, setSortBy]     = useState("created_at");
  const [sortDir, setSortDir]   = useState<"asc" | "desc">("desc");
  const [refundId, setRefundId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const params = new URLSearchParams({
    page: String(page),
    limit: "20",
    sort: sortBy,
    dir: sortDir,
    ...(q      ? { q }      : {}),
    ...(status ? { status } : {}),
  });

  const { data, loading, refetch } = useAdminData<{
    bookings: AdminBooking[];
    total: number;
    pages: number;
    revenue: { total: number };
  }>(`/api/admin/bookings?${params}`);

  const handleSort = useCallback((key: string) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir("desc"); }
    setPage(1);
  }, [sortBy]);

  async function handleRefund() {
    if (!refundId) return;
    setActionLoading(true);
    try {
      await fetch(`/api/admin/bookings/${refundId}/refund`, { method: "POST" });
      refetch();
    } finally {
      setActionLoading(false);
      setRefundId(null);
    }
  }

  const columns: Column<AdminBooking>[] = [
    {
      key: "event",
      header: isRTL ? "الفعالية" : "Event",
      render: (row) => (
        <div>
          <p className="font-medium text-[#2C2C2C] text-sm">
            {isRTL ? row.events?.title_ar : row.events?.title_en}
          </p>
          <p className="text-xs text-[#2C2C2C]/50 mt-0.5">
            {row.ticket_types ? (isRTL ? row.ticket_types.name_ar : row.ticket_types.name_en) : "—"}
          </p>
        </div>
      ),
    },
    {
      key: "user",
      header: isRTL ? "المستخدم" : "User",
      render: (row) => (
        <span className="text-sm text-[#2C2C2C]/70">
          {row.profiles?.full_name ?? "—"}
        </span>
      ),
    },
    {
      key: "quantity",
      header: isRTL ? "الكمية" : "Qty",
      render: (row) => (
        <span className="text-sm font-medium text-[#2C2C2C]">{row.quantity}</span>
      ),
    },
    {
      key: "total_amount",
      header: isRTL ? "المبلغ" : "Amount",
      sortable: true,
      render: (row) => (
        <span className="text-sm font-semibold text-[#2C2C2C]">
          {formatCurrency(row.total_amount, row.currency, isRTL ? "ar-SA" : "en-US")}
        </span>
      ),
    },
    {
      key: "status",
      header: isRTL ? "الحالة" : "Status",
      render: (row) => <StatusBadge status={row.status} locale={locale as "ar" | "en"} />,
    },
    {
      key: "created_at",
      header: isRTL ? "التاريخ" : "Date",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-[#2C2C2C]/60">
          {formatDateTime(row.created_at, isRTL ? "ar-SA" : "en-US")}
        </span>
      ),
    },
    {
      key: "actions",
      header: isRTL ? "إجراءات" : "Actions",
      render: (row) =>
        row.status === "confirmed" ? (
          <button
            onClick={() => setRefundId(row.id)}
            title={isRTL ? "استرداد" : "Refund"}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
          >
            <RefreshCw size={12} />
            {isRTL ? "استرداد" : "Refund"}
          </button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2C2C2C]">
            {isRTL ? "الحجوزات" : "Bookings"}
          </h1>
          <p className="text-sm text-[#2C2C2C]/50 mt-1">
            {isRTL ? "إدارة الحجوزات والمدفوعات" : "Manage bookings and payments"}
          </p>
        </div>
        {data?.revenue && (
          <div className="bg-[#1B4D4D]/5 rounded-2xl px-5 py-3 text-end">
            <p className="text-xs text-[#2C2C2C]/50">
              {isRTL ? "إجمالي الإيرادات" : "Total Revenue"}
            </p>
            <p className="text-xl font-bold text-[#1B4D4D]">
              {formatCurrency(data.revenue.total, "SAR", isRTL ? "ar-SA" : "en-US")}
            </p>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <SearchBar
          value={q}
          onChange={(v) => { setQ(v); setPage(1); }}
          placeholder={isRTL ? "بحث برقم المرجع..." : "Search by payment ref..."}
          className="flex-1 min-w-48"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-xl border border-black/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#1B4D4D]/20"
        >
          <option value="">{isRTL ? "كل الحالات" : "All Statuses"}</option>
          {BOOKING_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data?.bookings ?? []}
        loading={loading}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        rowKey={(r) => r.id}
        emptyMessage={isRTL ? "لا توجد حجوزات" : "No bookings found"}
      />

      <Pagination
        page={page}
        pages={data?.pages ?? 1}
        total={data?.total ?? 0}
        limit={20}
        onPageChange={setPage}
        isRTL={isRTL}
      />

      <ConfirmDialog
        open={!!refundId}
        onClose={() => setRefundId(null)}
        onConfirm={handleRefund}
        loading={actionLoading}
        title={isRTL ? "استرداد المبلغ" : "Process Refund"}
        message={isRTL ? "هل تريد استرداد مبلغ هذا الحجز؟ لا يمكن التراجع عن هذا الإجراء." : "Process a refund for this booking? This action cannot be undone."}
        confirmLabel={isRTL ? "استرداد" : "Refund"}
        cancelLabel={isRTL ? "إلغاء" : "Cancel"}
        variant="warning"
      />
    </div>
  );
}
