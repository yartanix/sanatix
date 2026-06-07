"use client";

import { useState, useCallback } from "react";
import { useLocale } from "next-intl";
import { CheckCircle, EyeOff, Eye } from "lucide-react";
import DataTable, { Column } from "@/components/admin/DataTable";
import Pagination from "@/components/admin/Pagination";
import SearchBar from "@/components/admin/SearchBar";
import StatusBadge from "@/components/admin/StatusBadge";
import UserAvatar from "@/components/admin/UserAvatar";
import Modal from "@/components/admin/Modal";
import { formatDateTime } from "@/lib/utils";
import { useAdminData } from "@/hooks/useAdminData";

interface ContentReport {
  id: string;
  reported_entity_type: string;
  reported_entity_id: string;
  reason: string;
  description: string | null;
  status: string;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  reporter_id: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
}

const REPORT_STATUSES = ["pending", "reviewed", "resolved", "dismissed"];
const ENTITY_TYPES    = ["event", "vendor", "user", "booking"];

export default function AdminReportsPage() {
  const locale = useLocale();
  const isRTL = locale === "ar";

  const [page, setPage]           = useState(1);
  const [status, setStatus]       = useState("");
  const [entityType, setEntityType] = useState("");
  const [sortBy, setSortBy]       = useState("created_at");
  const [sortDir, setSortDir]     = useState<"asc" | "desc">("desc");
  const [resolveModal, setResolveModal] = useState<ContentReport | null>(null);
  const [resolveStatus, setResolveStatus] = useState("resolved");
  const [resolveNotes, setResolveNotes]   = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const params = new URLSearchParams({
    page: String(page),
    limit: "20",
    sort: sortBy,
    dir: sortDir,
    ...(status     ? { status }                   : {}),
    ...(entityType ? { entity_type: entityType }  : {}),
  });

  const { data, loading, refetch } = useAdminData<{
    reports: ContentReport[];
    total: number;
    pages: number;
  }>(`/api/admin/reports?${params}`);

  const handleSort = useCallback((key: string) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir("desc"); }
    setPage(1);
  }, [sortBy]);

  async function handleResolve() {
    if (!resolveModal) return;
    setActionLoading(true);
    try {
      await fetch(`/api/admin/reports/${resolveModal.id}/resolve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: resolveStatus, notes: resolveNotes }),
      });
      refetch();
    } finally {
      setActionLoading(false);
      setResolveModal(null);
      setResolveNotes("");
    }
  }

  const columns: Column<ContentReport>[] = [
    {
      key: "reporter",
      header: isRTL ? "المُبلِّغ" : "Reporter",
      render: (row) => (
        <div className="flex items-center gap-2">
          <UserAvatar
            name={row.profiles?.full_name}
            avatarUrl={row.profiles?.avatar_url}
            size="sm"
          />
          <span className="text-sm text-[#2C2C2C]">{row.profiles?.full_name ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "reported_entity_type",
      header: isRTL ? "نوع المحتوى" : "Entity Type",
      render: (row) => (
        <span className="text-sm text-[#2C2C2C]/70 capitalize">
          {row.reported_entity_type}
        </span>
      ),
    },
    {
      key: "reason",
      header: isRTL ? "السبب" : "Reason",
      render: (row) => (
        <span className="text-sm text-[#2C2C2C] line-clamp-1 max-w-xs">{row.reason}</span>
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
        row.status === "pending" || row.status === "reviewed" ? (
          <button
            onClick={() => {
              setResolveModal(row);
              setResolveStatus("resolved");
              setResolveNotes("");
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#1B4D4D]/10 text-[#1B4D4D] hover:bg-[#1B4D4D]/20 transition-colors"
          >
            <CheckCircle size={13} />
            {isRTL ? "معالجة" : "Resolve"}
          </button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#2C2C2C]">
          {isRTL ? "البلاغات" : "Content Reports"}
        </h1>
        <p className="text-sm text-[#2C2C2C]/50 mt-1">
          {isRTL ? "مراجعة ومعالجة بلاغات المحتوى" : "Review and resolve content reports"}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-xl border border-black/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#1B4D4D]/20"
        >
          <option value="">{isRTL ? "كل الحالات" : "All Statuses"}</option>
          {REPORT_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-xl border border-black/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#1B4D4D]/20"
        >
          <option value="">{isRTL ? "كل الأنواع" : "All Types"}</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data?.reports ?? []}
        loading={loading}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        rowKey={(r) => r.id}
        emptyMessage={isRTL ? "لا توجد بلاغات" : "No reports found"}
      />

      <Pagination
        page={page}
        pages={data?.pages ?? 1}
        total={data?.total ?? 0}
        limit={20}
        onPageChange={setPage}
        isRTL={isRTL}
      />

      {/* Resolve modal */}
      <Modal
        open={!!resolveModal}
        onClose={() => setResolveModal(null)}
        title={isRTL ? "معالجة البلاغ" : "Resolve Report"}
        size="md"
      >
        {resolveModal && (
          <div className="space-y-4">
            <div className="bg-[#F9F7F4] rounded-xl p-4 text-sm">
              <p className="font-medium text-[#2C2C2C]">{resolveModal.reason}</p>
              {resolveModal.description && (
                <p className="text-[#2C2C2C]/60 mt-1">{resolveModal.description}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2C2C2C] mb-1.5">
                {isRTL ? "الإجراء" : "Action"}
              </label>
              <select
                value={resolveStatus}
                onChange={(e) => setResolveStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-black/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#1B4D4D]/20"
              >
                <option value="reviewed">{isRTL ? "تمت المراجعة" : "Reviewed"}</option>
                <option value="resolved">{isRTL ? "تم الحل" : "Resolved"}</option>
                <option value="dismissed">{isRTL ? "مرفوض" : "Dismissed"}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2C2C2C] mb-1.5">
                {isRTL ? "ملاحظات القرار" : "Resolution Notes"}
              </label>
              <textarea
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                rows={3}
                placeholder={isRTL ? "اكتب ملاحظاتك..." : "Enter resolution notes..."}
                className="w-full px-4 py-3 rounded-xl border border-black/10 bg-[#F9F7F4] text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/40 focus:outline-none focus:ring-2 focus:ring-[#1B4D4D]/20 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setResolveModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-black/10 text-sm font-medium text-[#2C2C2C]/70 hover:bg-[#F0EDE4] transition-colors"
              >
                {isRTL ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleResolve}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#1B4D4D] text-white text-sm font-medium hover:bg-[#1B4D4D]/90 transition-colors disabled:opacity-50"
              >
                {actionLoading ? "..." : (isRTL ? "حفظ" : "Save")}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
