import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { CalendarDays, MapPin, Plus, Users } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { Link } from "@/i18n/routing";
import { formatDateTime } from "@/lib/utils";
import type { Party, RsvpStatus } from "@/types";

export const metadata: Metadata = { robots: { index: false, follow: false } };

interface PartyRow extends Party {
  party_guests: { id: string; rsvp_status: RsvpStatus }[];
}

export default async function PartiesPage() {
  const locale = await getLocale();
  const isRTL = locale === "ar";
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/parties`);

  const { data } = await supabase
    .from("parties")
    .select("*, party_guests(id, rsvp_status)")
    .eq("host_id", user.id)
    .order("starts_at", { ascending: true });

  const parties = (data ?? []) as PartyRow[];

  return (
    <div className="min-h-screen bg-brand-warm-white">
      <Navbar />

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-brand-midnight">
              {isRTL ? "حفلاتي" : "My Parties"}
            </h1>
            <p className="text-sm text-brand-ink/55 mt-1">
              {isRTL ? "نظّم حفلة وادعُ من تريد مباشرة من قائمة جهات اتصالك" : "Arrange a party and invite people straight from your contacts"}
            </p>
          </div>
          <Link
            href="/parties/new"
            className="shrink-0 flex items-center gap-1.5 text-sm font-semibold text-brand-midnight rounded-full px-4 py-2.5 bg-gradient-to-br from-brand-gold-light to-brand-gold hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            {isRTL ? "حفلة جديدة" : "New Party"}
          </Link>
        </div>

        {parties.length === 0 ? (
          <div className="bg-white rounded-3xl border border-black/5 p-12 text-center">
            <p className="text-brand-ink/50 text-sm mb-4">
              {isRTL ? "لم تنظّم أي حفلة بعد" : "You haven't arranged a party yet"}
            </p>
            <Link href="/parties/new" className="text-sm font-semibold text-brand-gold hover:underline">
              {isRTL ? "ابدأ الآن" : "Start one now"}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {parties.map((party) => {
              const yes = party.party_guests.filter((g) => g.rsvp_status === "yes").length;
              const total = party.party_guests.length;
              return (
                <Link
                  key={party.id}
                  href={`/parties/${party.id}`}
                  className="flex items-center justify-between gap-4 bg-white rounded-2xl border border-black/5 p-5 hover:border-brand-gold/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-brand-midnight truncate">{party.title}</p>
                    <div className="flex items-center gap-1.5 text-xs text-brand-ink/55 mt-1.5">
                      <CalendarDays size={12} />
                      {formatDateTime(party.starts_at, isRTL ? "ar-SA" : "en-US")}
                    </div>
                    {party.location_name && (
                      <div className="flex items-center gap-1.5 text-xs text-brand-ink/55 mt-1">
                        <MapPin size={12} />
                        {party.location_name}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5 text-sm font-semibold text-brand-ink/70 bg-brand-sand rounded-full px-3 py-1.5">
                    <Users size={13} />
                    {yes}/{total}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
