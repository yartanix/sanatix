"use client";

import { useState, useCallback } from "react";
import { useLocale } from "next-intl";
import DataTable, { Column } from "@/components/admin/DataTable";
import Pagination from "@/components/admin/Pagination";
import UserAvatar from "@/components/admin/UserAvatar";
import { formatDateTime } from "@/lib/utils";
import { useAdminData } from "@/hooks/useAdminData";

interface ActivityLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  admin_id: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
}

const ACTION_COLORS: Record<string, string> = {
  approve_event:  "bg-emerald-50 text-emerald-700",
  reject_event:   "bg-red-50 text-red-700",
  verify_vendor:  "bg-blue-50 text-blue-700",
  unverify_vendor:"bg-orange-50 text-orange-700",
  refund_booking: "bg-purple-50 text-purple-700",
  update_user:    "bg-amber-50 text-amber-700",
  update_setting: "bg-[#1B4D4D]/10 text-[#1B4D4D]",
  resolve_report: "bg-emerald-50 text-emerald-700",
};

export default function AdminLogsPage() {
  const locale = useLocale();
  const isRTL = locale === "ar";

  const [page, setPage]           = useState(1);
  const [action, setAction]       = useState("");
  const [entityType, setEntityType] = useState("");
  const [sortBy, setSortBy]       = useState("created_at");
  const [sortDir, setSortDir]     = useState<"asc" | "desc">("desc");

  const params = new URLSearchParams({
    page: String(page),
    limit: "20",
    sort: sortBy,
    dir: sortDir,
    ...(action     ? { action }                   : {}),
    ...(entityType ? { entity_type: entityType }  : {}),
  });

  const { data, loading } = useAdminData<{
    logs: ActivityLog[];
    total: number;
    pages: number;
  }>(`/api/admin/activity-logs?${params}`);

  const handleSort = useCallback((key: string) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir("desc"); }
    setPage(1);
  }, [sortBy]);

  const columns: Column<ActivityLog>[] = [
    {
      key: "admin",
      header: isRTL ? "المدير" : "Admin",
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
      key: "action",
      header: isRTL ? "الإجراء" : "Action",
      render: (row) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            ACTION_COLORS[row.action] ?? "bg-gray-50 text-gray-600"
          }`}
        >
          {row.action.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "entity_type",
      header: isRTL ? "نوع الكيان" : "Entity",
      render: (row) => (
        <span className="text-sm text-[#2C2C2C]/70 capitalize">{row.entity_type}</span>
      ),
    },
    {
      key: "changes",
      header: isRTL ? "التغييرات" : "Changes",
      render: (row) =>
        row.changes ? (
          <span className="text-xs text-[#2C2C2C]/50 font-mono truncate max-w-xs block">
            {JSON.stringify(row.changes)}
          </span>
        ) : (
          <span className="text-[#2C2C2C]/30">—</span>
        ),
    },
    {
      key: "ip_address",
      header: isRTL ? "عنوان IP" : "IP Address",
      render: (row) => (
        <span className="text-xs text-[#2C2C2C]/50 font-mono">{row.ip_address ?? "—"}</span>
      ),
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
  ];

  const uniqueActions = Array.from(new Set(data?.logs.map((l) => l.action) ?? []));
  const uniqueEntities = Array.from(new Set(data?.logs.map((l) => l.entity_type) ?? []));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#2C2C2C]">
          {isRTL ? "سجل النشاط" : "Activity Logs"}
        </h1>
        <p className="text-sm text-[#2C2C2C]/50 mt-1">
          {isRTL ? "سجل كامل لإجراءات المدراء" : "Complete audit trail of admin actions"}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-xl border border-black/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#1B4D4D]/20"
        >
          <option value="">{isRTL ? "كل الإجراءات" : "All Actions"}</option>
          {uniqueActions.map((a) => (
            <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
          ))}
        </select>
        <select
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-xl border border-black/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#1B4D4D]/20"
        >
          <option value="">{isRTL ? "كل الكيانات" : "All Entities"}</option>
          {uniqueEntities.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data?.logs ?? []}
        loading={loading}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        rowKey={(r) => r.id}
        emptyMessage={isRTL ? "لا توجد سجلات" : "No activity logs found"}
      />

      <Pagination
        page={page}
        pages={data?.pages ?? 1}
        total={data?.total ?? 0}
        limit={20}
        onPageChange={setPage}
        isRTL={isRTL}
      />
    </div>
  );
}
