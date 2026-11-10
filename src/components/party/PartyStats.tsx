import type { PartyGuest } from "@/types";

// Pure display — everything here is already on the page from the same
// party_guests fetch GuestManager uses, so this needs no extra query.
// Mirrors the "instant statistics" pitch competing invitation apps lead
// with, built on data this app already captures.
export default function PartyStats({ guests, isRTL }: { guests: PartyGuest[]; isRTL: boolean }) {
  const total = guests.length;
  const yes = guests.filter((g) => g.rsvp_status === "yes");
  const no = guests.filter((g) => g.rsvp_status === "no").length;
  const maybe = guests.filter((g) => g.rsvp_status === "maybe").length;
  const pending = guests.filter((g) => g.rsvp_status === "pending").length;
  const confirmedHeadcount = yes.reduce((sum, g) => sum + (g.guest_count || 1), 0);
  const checkedIn = guests.filter((g) => g.checked_in_at).length;
  const responded = total - pending;
  const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;

  if (total === 0) return null;

  const rows: { label_en: string; label_ar: string; value: number | string }[] = [
    { label_en: "Response rate", label_ar: "نسبة الرد", value: `${responseRate}%` },
    { label_en: "Confirmed guests", label_ar: "الضيوف المؤكدون", value: confirmedHeadcount },
    { label_en: "Checked in", label_ar: `تسجيل دخول / ${yes.length}`, value: `${checkedIn} / ${yes.length}` },
  ];

  const breakdown = [
    { key: "yes", en: "Going", ar: "سيحضر", value: yes.length, color: "bg-emerald-500" },
    { key: "maybe", en: "Maybe", ar: "ربما", value: maybe, color: "bg-amber-500" },
    { key: "no", en: "Can't go", ar: "لن يحضر", value: no, color: "bg-rose-500" },
    { key: "pending", en: "No reply yet", ar: "بلا رد", value: pending, color: "bg-black/15" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-black/5 p-5 space-y-4">
      <h2 className="font-bold text-brand-midnight">{isRTL ? "إحصاءات الحفلة" : "Party stats"}</h2>

      <div className="grid grid-cols-3 gap-3">
        {rows.map((r) => (
          <div key={r.label_en} className="rounded-xl bg-brand-sand/60 px-3 py-3 text-center">
            <p className="text-lg font-extrabold text-brand-midnight">{r.value}</p>
            <p className="text-[11px] text-brand-ink/50 mt-0.5">{isRTL ? r.label_ar : r.label_en}</p>
          </div>
        ))}
      </div>

      <div className="flex h-2.5 rounded-full overflow-hidden bg-black/5">
        {breakdown.map(
          (b) =>
            b.value > 0 && (
              <div key={b.key} className={b.color} style={{ width: `${(b.value / total) * 100}%` }} title={b.en} />
            )
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {breakdown.map((b) => (
          <span key={b.key} className="flex items-center gap-1.5 text-xs text-brand-ink/55">
            <span className={`w-2 h-2 rounded-full ${b.color}`} />
            {isRTL ? b.ar : b.en} · {b.value}
          </span>
        ))}
      </div>
    </div>
  );
}
