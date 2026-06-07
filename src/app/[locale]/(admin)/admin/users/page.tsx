"use client";

import { useState, useCallback } from "react";
import { useLocale } from "next-intl";
import { UserCheck, UserX, Shield, MoreHorizontal } from "lucide-react";
import DataTable, { Column } from "@/components/admin/DataTable";
import Pagination from "@/components/admin/Pagination";
import SearchBar from "@/components/admin/SearchBar";
import StatusBadge from "@/components/admin/StatusBadge";
import UserAvatar from "@/components/admin/UserAvatar";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { formatDateTime } from "@/lib/utils";
import { useAdminData } from "@/hooks/useAdminData";

interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  locale: string;
  city: string | null;
  country: string;
  created_at: string;
}

const ROLES = ["customer", "organizer", "supplier", "admin", "influencer"];

export default function AdminUsersPage() {
  const locale = useLocale();
  const isRTL = locale === "ar";

  const [page, setPage]         = useState(1);
  const [q, setQ]               = useState("");
  const [role, setRole]         = useState("");
  const [sortBy, setSortBy]     = useState("created_at");
  const [sortDir, setSortDir]   = useState<"asc" | "desc">("desc");
  const [confirm, setConfirm]   = useState<{ id: string; action: "ban" | "promote" } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const params = new URLSearchParams({
    page: String(page),
    limit: "20",
    sort: sortBy,
    dir: sortDir,
    ...(q    ? { q }    : {}),
    ...(role ? { role } : {}),
  });

  const { data, loading, refetch } = useAdminData<{
    users: Profile[];
    total: number;
    pages: number;
  }>(`/api/admin/users?${params}`);

  const handleSort = useCallback((key: string) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("desc");
    }
    setPage(1);
  }, [sortBy]);

  async function handleAction() {
    if (!confirm) return;
    setActionLoading(true);
    try {
      const newRole = confirm.action === "promote" ? "admin" : "customer";
      await fetch(`/api/admin/users/${confirm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      refetch();
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  }

  const columns: Column<Profile>[] = [
    {
      key: "full_name",
      header: isRTL ? "المستخدم" : "User",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <UserAvatar name={row.full_name} avatarUrl={row.avatar_url} size="sm" />
          <div>
            <p className="font-medium text-[#2C2C2C] text-sm">{row.full_name ?? "—"}</p>
            <p className="text-xs text-[#2C2C2C]/50">{row.city ?? row.country}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: isRTL ? "الدور" : "Role",
      sortable: true,
      render: (row) => <StatusBadge status={row.role} locale={locale as "ar" | "en"} />,
    },
    {
      key: "phone",
      header: isRTL ? "الجوال" : "Phone",
      render: (row) => <span className="text-[#2C2C2C]/60">{row.phone ?? "—"}</span>,
    },
    {
      key: "created_at",
      header: isRTL ? "تاريخ التسجيل" : "Joined",
      sortable: true,
      render: (row) => (
        <span className="text-[#2C2C2C]/60 text-xs">
          {formatDateTime(row.created_at, isRTL ? "ar-SA" : "en-US")}
        </span>
      ),
    },
    {
      key: "actions",
      header: isRTL ? "إجراءات" : "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.role !== "admin" && (
            <button
              onClick={() => setConfirm({ id: row.id, action: "promote" })}
              title={isRTL ? "ترقية لمدير" : "Promote to admin"}
              className="p-1.5 rounded-lg hover:bg-[#1B4D4D]/10 text-[#1B4D4D] transition-colors"
            >
              <Shield size={14} />
            </button>
          )}
          <button
            onClick={() => setConfirm({ id: row.id, action: "ban" })}
            title={isRTL ? "تعيين كعميل" : "Reset to customer"}
            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
          >
            <UserX size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2C2C2C]">
            {isRTL ? "المستخدمون" : "Users"}
          </h1>
          <p className="text-sm text-[#2C2C2C]/50 mt-1">
            {isRTL ? "إدارة حسابات المستخدمين" : "Manage user accounts"}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <SearchBar
          value={q}
          onChange={(v) => { setQ(v); setPage(1); }}
          placeholder={isRTL ? "بحث بالاسم أو الجوال..." : "Search by name or phone..."}
          className="flex-1 min-w-48"
        />
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-xl border border-black/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#1B4D4D]/20"
        >
          <option value="">{isRTL ? "كل الأدوار" : "All Roles"}</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data?.users ?? []}
        loading={loading}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        rowKey={(r) => r.id}
        emptyMessage={isRTL ? "لا يوجد مستخدمون" : "No users found"}
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
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleAction}
        loading={actionLoading}
        title={
          confirm?.action === "promote"
            ? (isRTL ? "ترقية المستخدم" : "Promote User")
            : (isRTL ? "إعادة تعيين الدور" : "Reset Role")
        }
        message={
          confirm?.action === "promote"
            ? (isRTL ? "هل تريد ترقية هذا المستخدم إلى مدير؟" : "Promote this user to admin role?")
            : (isRTL ? "هل تريد إعادة تعيين هذا المستخدم كعميل؟" : "Reset this user to customer role?")
        }
        confirmLabel={isRTL ? "تأكيد" : "Confirm"}
        cancelLabel={isRTL ? "إلغاء" : "Cancel"}
        variant={confirm?.action === "ban" ? "danger" : "default"}
      />
    </div>
  );
}
