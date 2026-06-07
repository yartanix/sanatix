"use client";

import { useState, useCallback } from "react";
import { useLocale } from "next-intl";
import { CheckCircle, XCircle, Eye } from "lucide-react";
import DataTable, { Column } from "@/components/admin/DataTable";
import Pagination from "@/components/admin/Pagination";
import SearchBar from "@/components/admin/SearchBar";
import StatusBadge from "@/components/admin/StatusBadge";
import Modal from "@/components/admin/Modal";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { formatDateTime } from "@/lib/utils";
import { useAdminData } from "@/hooks/useAdminData";

interface AdminEvent {
  id: string;
  title_ar: string;
  title_en: string;
  status: string;
  event_status: string | null;
  starts_at: string;
  venue_city: string;
  category: string;
  view_count: number;
  created_at: string;
  organizer_id: string;
  profiles: { full_name: string | null } | null;
  ticket_types: { price: number; currency: string; sold_quantity: number; total_quantity: number }[];
}

const EVENT_STATUSES = ["pending", "approved", "rejected", "suspended"];

export default function AdminEventsPage() {
  const locale = useLocale();
  const isRTL = locale === "ar";

  const [page, setPage]           = useState(1);
  const [q, setQ]                 = useState("");
  const [eventStatus, setEventStatus] = useState("");
  const [sortBy, setSortBy]       = useState("created_at");
  const [sortDir, setSortDir]     = useState<"asc" | "desc">("desc");
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approveConfirm, setApproveConfirm] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const params = new URLSearchParams({
    page: String(page),
    limit: "20",
    sort: sortBy,
    dir: sortDir,
    ...(q           ? { q }                         : {}),
    ...(eventStatus ? { event_status: eventStatus } : {}),
  });

  const { data, loading, refetch } = useAdminData<{
    events: AdminEvent[];
    total: number;
    pages: number;
  }>(`/api/admin/events?${params}`);

  const handleSort = useCallback((key: string) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir("desc"); }
    setPage(1);
  }, [sortBy]);

  async function handleApprove() {
    if (!approveConfirm) return;
    setActionLoading(true);
    try {
      await fetch(`/api/admin/events/${approveConfirm}/approve`, { method: "PUT" });
      refetch();
    } finally {
      setActionLoading(false);
      setApproveConfirm(null);
    }
  }

  async function handleReject() {
    if (!rejectModal || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await fetch(`/api/admin/events/${rejectModal}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      refetch();
    } finally {
      setActionLoading(false);
      setRejectModal(null);
      setRejectReason("");
    }
  }

  const columns: Column<AdminEvent>[] = [
    {
      key: "title_en",
      header: isRTL ? "الفعالية" : "Event",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-[#2C2C2C] text-sm">
            {isRTL ? row.title_ar : row.title_en}
          </p>
          <p className="text-xs text-[#2C2C2C]/50 mt-0.5">
            {row.profiles?.full_name ?? "—"} · {row.venue_city}
          </p>
        </div>
      ),
    },
    {
      key: "event_status",
      header: isRTL ? "حالة المراجعة" : "Review Status",
      render: (row) => (
        <StatusBadge
          status={row.event_status ?? "pending"}
          locale={locale as "ar" | "en"}
        />
      ),
    },
    {
      key: "status",
      header: isRTL ? "الحالة" : "Status",
      render: (row) => (
        <StatusBadge status={row.status} locale={locale as "ar" | "en"} />
      ),
    },
    {
      key: "starts_at",
      header: isRTL ? "تاريخ البدء" : "Start Date",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-[#2C2C2C]/60">
          {formatDateTime(row.starts_at, isRTL ? "ar-SA" : "en-US")}
        </span>
      ),
    },
    {
      key: "view_count",
      header: isRTL ? "المشاهدات" : "Views",
      sortable: true,
      render: (row) => (
        <span className="text-sm font-medium text-[#2C2C2C]">
          {(row.view_count ?? 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: isRTL ? "إجراءات" : "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.event_status !== "approved" && (
            <button
              onClick={() => setApproveConfirm(row.id)}
              title={isRTL ? "موافقة" : "Approve"}
              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
            >
              <CheckCircle size={15} />
            </button>
          )}
          {row.event_status !== "rejected" && (
            <button
              onClick={() => { setRejectModal(row.id); setRejectReason(""); }}
              title={isRTL ? "رفض" : "Reject"}
              className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
            >
              <XCircle size={15} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#2C2C2C]">
          {isRTL ? "الفعاليات" : "Events"}
        </h1>
        <p className="text-sm text-[#2C2C2C]/50 mt-1">
          {isRTL ? "مراجعة وإدارة الفعاليات" : "Review and manage events"}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <SearchBar
          value={q}
          onChange={(v) => { setQ(v); setPage(1); }}
          placeholder={isRTL ? "بحث بعنوان الفعالية..." : "Search by event title..."}
          className="flex-1 min-w-48"
        />
        <select
          value={eventStatus}
          onChange={(e) => { setEventStatus(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-xl border border-black/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#1B4D4D]/20"
        >
          <option value="">{isRTL ? "كل الحالات" : "All Statuses"}</option>
          {EVENT_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data?.events ?? []}
        loading={loading}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        rowKey={(r) => r.id}
        emptyMessage={isRTL ? "لا توجد فعاليات" : "No events found"}
      />

      <Pagination
        page={page}
        pages={data?.pages ?? 1}
        total={data?.total ?? 0}
        limit={20}
        onPageChange={setPage}
        isRTL={isRTL}
      />

      {/* Approve confirm */}
      <ConfirmDialog
        open={!!approveConfirm}
        onClose={() => setApproveConfirm(null)}
        onConfirm={handleApprove}
        loading={actionLoading}
        title={isRTL ? "الموافقة على الفعالية" : "Approve Event"}
        message={isRTL ? "هل تريد الموافقة على هذه الفعالية ونشرها؟" : "Approve and publish this event?"}
        confirmLabel={isRTL ? "موافقة" : "Approve"}
        cancelLabel={isRTL ? "إلغاء" : "Cancel"}
        variant="default"
      />

      {/* Reject modal */}
      <Modal
        open={!!rejectModal}
        onClose={() => setRejectModal(null)}
        title={isRTL ? "رفض الفعالية" : "Reject Event"}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2C2C2C] mb-1.5">
              {isRTL ? "سبب الرفض" : "Rejection Reason"}
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder={isRTL ? "اكتب سبب الرفض..." : "Enter rejection reason..."}
              className="w-full px-4 py-3 rounded-xl border border-black/10 bg-[#F9F7F4] text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/40 focus:outline-none focus:ring-2 focus:ring-[#1B4D4D]/20 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setRejectModal(null)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-black/10 text-sm font-medium text-[#2C2C2C]/70 hover:bg-[#F0EDE4] transition-colors"
            >
              {isRTL ? "إلغاء" : "Cancel"}
            </button>
            <button
              onClick={handleReject}
              disabled={!rejectReason.trim() || actionLoading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {actionLoading ? "..." : (isRTL ? "رفض" : "Reject")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
