import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { formatDateTime, formatCurrency } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_BADGE: Record<string, string> = {
  confirmed: "bg-emerald-500/10 text-emerald-600",
  pending:   "bg-amber-500/10 text-amber-600",
  cancelled: "bg-red-500/10 text-red-500",
  refunded:  "bg-black/5 text-brand-ink/50",
};

const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  confirmed: { ar: "مؤكد",   en: "Confirmed" },
  pending:   { ar: "معلق",   en: "Pending" },
  cancelled: { ar: "ملغي",   en: "Cancelled" },
  refunded:  { ar: "مسترجع", en: "Refunded" },
};

export const metadata = { title: "Attendees - Sanatix" };

export default async function AttendeesPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const locale = await getLocale();
  const isRTL = locale === "ar";

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: event } = await supabase
    .from("events")
    .select("id, title_ar, title_en")
    .eq("id", id)
    .eq("organizer_id", user.id)
    .single();
  if (!event) notFound();

  interface AttendeeRow {
    id: string;
    quantity: number;
    total_amount: number;
    currency: string;
    status: string;
    qr_code: string | null;
    created_at: string;
    profiles: { full_name: string | null; phone: string | null } | null;
    ticket_types: { name_ar: string; name_en: string } | null;
  }

  const { data: bookingsData } = await supabase
    .from("bookings")
    .select("id, quantity, total_amount, currency, status, qr_code, created_at, profiles(full_name, phone), ticket_types(name_ar, name_en)")
    .eq("event_id", id)
    .order("created_at", { ascending: false });

  // Supabase's untyped query builder can't infer that these are to-one
  // relations (bookings.user_id -> profiles, bookings.ticket_type_id ->
  // ticket_types) without generated DB types, so it widens them to arrays.
  // They're always single rows or null at runtime — cast accordingly.
  const bookings = bookingsData as unknown as AttendeeRow[] | null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/organizer/events" className="text-xs text-brand-ink/40 hover:text-brand-gold">
          {isRTL ? "← فعالياتي" : "← Your Events"}
        </Link>
        <h1 className="text-2xl font-semibold text-brand-midnight mt-2">
          {isRTL ? "الحضور" : "Attendees"} — {isRTL ? event.title_ar : event.title_en}
        </h1>
        <p className="text-sm text-brand-ink/50 mt-1">
          {bookings?.length ?? 0} {isRTL ? "حجز" : "bookings"}
        </p>
      </div>

      {!bookings || bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/5 p-12 text-center">
          <p className="text-brand-ink/60 text-sm">{isRTL ? "لا توجد حجوزات بعد" : "No bookings yet"}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 text-brand-ink/50">
                <th className="text-start px-5 py-3 font-medium">{isRTL ? "الحاضر" : "Attendee"}</th>
                <th className="text-start px-5 py-3 font-medium hidden md:table-cell">{isRTL ? "نوع التذكرة" : "Ticket"}</th>
                <th className="text-start px-5 py-3 font-medium">{isRTL ? "العدد" : "Qty"}</th>
                <th className="text-start px-5 py-3 font-medium hidden md:table-cell">{isRTL ? "المبلغ" : "Amount"}</th>
                <th className="text-start px-5 py-3 font-medium">{isRTL ? "الحالة" : "Status"}</th>
                <th className="text-start px-5 py-3 font-medium hidden lg:table-cell">{isRTL ? "تاريخ الحجز" : "Booked"}</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-black/5 last:border-0">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-brand-midnight">{b.profiles?.full_name || "—"}</p>
                    <p className="text-xs text-brand-ink/40">{b.profiles?.phone || ""}</p>
                  </td>
                  <td className="px-5 py-3.5 text-brand-ink/60 hidden md:table-cell">
                    {b.ticket_types ? (isRTL ? b.ticket_types.name_ar : b.ticket_types.name_en) : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-brand-ink/60">{b.quantity}</td>
                  <td className="px-5 py-3.5 text-brand-ink/60 hidden md:table-cell">
                    {b.total_amount === 0 ? (isRTL ? "مجاني" : "Free") : formatCurrency(b.total_amount, b.currency, isRTL ? "ar-SA" : "en-US")}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_BADGE[b.status] ?? "bg-black/5 text-brand-ink/50"}`}>
                      {isRTL ? STATUS_LABEL[b.status]?.ar ?? b.status : STATUS_LABEL[b.status]?.en ?? b.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-brand-ink/40 text-xs hidden lg:table-cell">
                    {formatDateTime(b.created_at, isRTL ? "ar-SA" : "en-US")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
