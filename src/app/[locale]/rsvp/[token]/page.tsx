import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { CalendarDays, MapPin } from "lucide-react";
import { Link } from "@/i18n/routing";
import RsvpForm from "@/components/party/RsvpForm";
import { formatDateTime } from "@/lib/utils";
import type { RsvpDetails } from "@/types";

interface PageProps {
  params: Promise<{ locale: string; token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const locale = await getLocale();
  const isRTL = locale === "ar";
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_rsvp_details", { token }).maybeSingle();
  const rsvp = data as RsvpDetails | null;

  return {
    title: rsvp ? `${rsvp.title} | Sanatix` : "Sanatix",
    description: rsvp
      ? isRTL
        ? `أنت مدعو إلى ${rsvp.title}`
        : `You're invited to ${rsvp.title}`
      : undefined,
    // A guest's personal RSVP link should never show up in search results
    // or get indexed — it's a private invitation, not public content.
    robots: { index: false, follow: false },
  };
}

export default async function RsvpPage({ params }: PageProps) {
  const { token } = await params;
  const locale = await getLocale();
  const isRTL = locale === "ar";
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_rsvp_details", { token }).maybeSingle();
  const rsvp = data as RsvpDetails | null;

  if (!rsvp) {
    return (
      <main className="min-h-screen bg-brand-warm-white flex items-center justify-center px-6">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-lg font-semibold text-brand-midnight">
            {isRTL ? "لم يتم العثور على الدعوة" : "Invitation not found"}
          </p>
          <p className="text-sm text-brand-ink/55">
            {isRTL
              ? "قد يكون الرابط غير صحيح أو تم إلغاء هذه الحفلة"
              : "This link may be incorrect, or the party was cancelled"}
          </p>
          <Link href="/" className="inline-block text-sm font-semibold text-brand-gold hover:underline">
            {isRTL ? "الذهاب إلى سناتيكس" : "Go to Sanatix"}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-warm-white flex flex-col">
      <div
        className="relative overflow-hidden text-center px-6 pt-16 pb-20"
        style={{
          background:
            "radial-gradient(900px 500px at 82% -10%, rgba(200,151,58,0.30), transparent 60%)," +
            "linear-gradient(180deg, #0F0F14 0%, #0F0F14 70%, #17151C 100%)",
        }}
      >
        <p className="text-xs font-semibold tracking-wide text-brand-gold-light uppercase mb-3">
          {isRTL ? `مرحباً ${rsvp.guest_name}، أنت مدعو` : `Hi ${rsvp.guest_name}, you're invited`}
        </p>
        <h1 className="max-w-md mx-auto text-3xl sm:text-4xl font-extrabold tracking-tight text-brand-warm-white leading-tight">
          {rsvp.title}
        </h1>
      </div>

      <div className="flex-1 px-6 -mt-10">
        <div className="max-w-md mx-auto bg-white rounded-3xl border border-black/5 shadow-[0_18px_40px_-18px_rgba(15,15,20,0.22)] p-6 space-y-5">
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 text-sm text-brand-ink/75">
              <CalendarDays size={16} className="mt-0.5 shrink-0 text-brand-gold" />
              {formatDateTime(rsvp.starts_at, isRTL ? "ar-SA" : "en-US")}
            </div>
            {(rsvp.location_name || rsvp.location_address) && (
              <div className="flex items-start gap-2.5 text-sm text-brand-ink/75">
                <MapPin size={16} className="mt-0.5 shrink-0 text-brand-gold" />
                <span>
                  {rsvp.location_name}
                  {rsvp.location_name && rsvp.location_address ? " — " : ""}
                  {rsvp.location_address}
                </span>
              </div>
            )}
          </div>

          {rsvp.notes && (
            <p className="text-sm text-brand-ink/60 leading-relaxed border-t border-black/5 pt-4">{rsvp.notes}</p>
          )}

          <div className="border-t border-black/5 pt-5">
            <RsvpForm
              token={token}
              initialStatus={rsvp.guest_rsvp_status}
              initialGuestCount={rsvp.guest_count}
              allowPlusOnes={rsvp.allow_plus_ones}
              customQuestion={rsvp.custom_question}
              initialCustomAnswer={rsvp.custom_answer}
              requireEntryCode={rsvp.require_entry_code}
              entryCode={rsvp.entry_code}
              isRTL={isRTL}
            />
          </div>
        </div>

        <p className="text-center text-xs text-brand-ink/35 mt-6 pb-10">
          {isRTL ? "تم تنظيم هذه الدعوة عبر" : "This invitation was organized with"}{" "}
          <Link href="/" className="font-semibold text-brand-ink/50 hover:text-brand-gold">
            Sanatix
          </Link>
        </p>
      </div>
    </main>
  );
}
