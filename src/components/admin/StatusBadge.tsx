import { cn } from "@/lib/utils";

type Status =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended"
  | "active"
  | "confirmed"
  | "cancelled"
  | "refunded"
  | "published"
  | "draft"
  | "completed"
  | "resolved"
  | "dismissed"
  | "reviewed"
  | string;

const statusConfig: Record<string, { label_en: string; label_ar: string; className: string }> = {
  pending:   { label_en: "Pending",   label_ar: "قيد الانتظار", className: "bg-amber-50 text-amber-700 border-amber-200" },
  approved:  { label_en: "Approved",  label_ar: "موافق عليه",   className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected:  { label_en: "Rejected",  label_ar: "مرفوض",        className: "bg-red-50 text-red-700 border-red-200" },
  suspended: { label_en: "Suspended", label_ar: "موقوف",        className: "bg-orange-50 text-orange-700 border-orange-200" },
  active:    { label_en: "Active",    label_ar: "نشط",          className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  confirmed: { label_en: "Confirmed", label_ar: "مؤكد",         className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label_en: "Cancelled", label_ar: "ملغي",         className: "bg-red-50 text-red-700 border-red-200" },
  refunded:  { label_en: "Refunded",  label_ar: "مسترد",        className: "bg-blue-50 text-blue-700 border-blue-200" },
  published: { label_en: "Published", label_ar: "منشور",        className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  draft:     { label_en: "Draft",     label_ar: "مسودة",        className: "bg-gray-50 text-gray-600 border-gray-200" },
  completed: { label_en: "Completed", label_ar: "مكتمل",        className: "bg-blue-50 text-blue-700 border-blue-200" },
  resolved:  { label_en: "Resolved",  label_ar: "محلول",        className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  dismissed: { label_en: "Dismissed", label_ar: "مرفوض",        className: "bg-gray-50 text-gray-600 border-gray-200" },
  reviewed:  { label_en: "Reviewed",  label_ar: "تمت المراجعة", className: "bg-blue-50 text-blue-700 border-blue-200" },
};

interface StatusBadgeProps {
  status: Status;
  locale?: "ar" | "en";
  className?: string;
}

export default function StatusBadge({ status, locale = "en", className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label_en: status,
    label_ar: status,
    className: "bg-gray-50 text-gray-600 border-gray-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      {locale === "ar" ? config.label_ar : config.label_en}
    </span>
  );
}
