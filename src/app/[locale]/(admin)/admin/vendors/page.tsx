"use client";

import { useState, useCallback } from "react";
import { useLocale } from "next-intl";
import { BadgeCheck, BadgeX, Star } from "lucide-react";
import DataTable, { Column } from "@/components/admin/DataTable";
import Pagination from "@/components/admin/Pagination";
import SearchBar from "@/components/admin/SearchBar";
import UserAvatar from "@/components/admin/UserAvatar";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { formatDateTime } from "@/lib/utils";
import { useAdminData } from "@/hooks/useAdminData";

interface AdminVendor {
  id: string;
  name_ar: string;
  name_en: string;
  category: string;
  city: string;
  country: string;
  is_verified: boolean;
  admin_verified: boolean;
  is_featured: boolean;
  rating: number | null;
  review_count: number;
  logo_url: string | null;
  created_at: string;
  owner_id: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
}

export default function AdminVendorsPage() {
  const locale = useLocale();
  const isRTL = locale === "ar";

  const [page, setPage]         = useState(1);
  const [q, setQ]               = useState("");
  const [verified, setVerified] = useState("");
  const [sortBy, setSortBy]     = useState("created_at");
  const [sortDir, setSortDir]   = useState<"asc" | "desc">("desc");
  const [confirm, setConfirm]   = useState<{ id: string; verify: boolean } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const params = new URLSearchParams({
    page: String(page),
    limit: "20",
    sort: sortBy,
    dir: sortDir,
    ...(q        ? { q }        : {}),
    ...(verified ? { verified } : {}),
  });

  const { data, loading, refetch } = useAdminData<{
    vendors: AdminVendor[];
    total: number;
    pages: number;
  }>(`/api/admin/vendors?${params}`);

  const handleSort = useCallback((key: string) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir("desc"); }
    setPage(1);
  }, [sortBy]);

  async function handleVerify() {
    if (!confirm) return;
    setActionLoading(true);
    try {
      await fetch(`/api/admin/vendors/${confirm.id}/verify`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verify: confirm.verify }),
      });
      refetch();
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  }

  const columns: Column<AdminVendor>[] = [
    {
      key: "name_en",
      header: isRTL ? "المورد" : "Vendor",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <UserAvatar name={isRTL ? row.name_ar : row.name_en} avatarUrl={row.logo_url} size="sm" />
          <div>
            <p className="font-medium text-[#2C2C2C] text-sm">
              {isRTL ? row.name_ar : row.name_en}
            </p>
            <p className="text-xs text-[#2C2C2C]/50 mt-0.5">
              {row.profiles?.full_name ?? "—"} · {row.city}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: isRTL ? "الفئة" : "Category",
      render: (row) => (
        <span className="text-sm text-[#2C2C2C]/70 capitalize">{row.category}</span>
      ),
    },
    {
      key: "rating",
      header: isRTL ? "التقييم" : "Rating",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1">
          <Star size={13} className="text-[#D4A574] fill-[#D4A574]" />
          <span className="text-sm font-medium text-[#2C2C2C]">
            {row.rating ? row.rating.toFixed(1) : "—"}
          </span>
          <span className="text-xs text-[#2C2C2C]/40">({row.review_count})</span>
        </div>
      ),
    },
    {
      key: "admin_verified",
      header: isRTL ? "التحقق" : "Verified",
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
            row.admin_verified
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
        >
          {row.admin_verified
            ? (isRTL ? "موثق" : "Verified")
            : (isRTL ? "بانتظار التحقق" : "Pending")}
        </span>
      ),
    },
    {
      key: "created_at",
      header: isRTL ? "تاريخ التسجيل" : "Joined",
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
      render: (row) => (
        <div className="flex items-center gap-1">
          {!row.admin_verified ? (
            <button
              onClick={() => setConfirm({ id: row.id, verify: true })}
              title={isRTL ? "توثيق" : "Verify"}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
            >
              <BadgeCheck size={13} />
              {isRTL ? "توثيق" : "Verify"}
            </button>
          ) : (
            <button
              onClick={() => setConfirm({ id: row.id, verify: false })}
              title={isRTL ? "إلغاء التوثيق" : "Unverify"}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              <BadgeX size={13} />
              {isRTL ? "إلغاء التوثيق" : "Unverify"}
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
          {isRTL ? "الموردون" : "Vendors"}
        </h1>
        <p className="text-sm text-[#2C2C2C]/50 mt-1">
          {isRTL ? "إدارة وتوثيق الموردين" : "Manage and verify vendors"}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <SearchBar
          value={q}
          onChange={(v) => { setQ(v); setPage(1); }}
          placeholder={isRTL ? "بحث باسم المورد..." : "Search by vendor name..."}
          className="flex-1 min-w-48"
        />
        <select
          value={verified}
          onChange={(e) => { setVerified(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-xl border border-black/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#1B4D4D]/20"
        >
          <option value="">{isRTL ? "الكل" : "All"}</option>
          <option value="true">{isRTL ? "موثق" : "Verified"}</option>
          <option value="false">{isRTL ? "بانتظار التحقق" : "Pending"}</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data?.vendors ?? []}
        loading={loading}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        rowKey={(r) => r.id}
        emptyMessage={isRTL ? "لا يوجد موردون" : "No vendors found"}
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
        onConfirm={handleVerify}
        loading={actionLoading}
        title={
          confirm?.verify
            ? (isRTL ? "توثيق المورد" : "Verify Vendor")
            : (isRTL ? "إلغاء توثيق المورد" : "Unverify Vendor")
        }
        message={
          confirm?.verify
            ? (isRTL ? "هل تريد توثيق هذا المورد؟" : "Verify this vendor?")
            : (isRTL ? "هل تريد إلغاء توثيق هذا المورد؟" : "Remove verification from this vendor?")
        }
        confirmLabel={isRTL ? "تأكيد" : "Confirm"}
        cancelLabel={isRTL ? "إلغاء" : "Cancel"}
        variant={confirm?.verify ? "default" : "danger"}
      />
    </div>
  );
}
