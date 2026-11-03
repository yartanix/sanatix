import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { CalendarDays, MapPin } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import GuestManager from "@/components/party/GuestManager";
import { formatDateTime } from "@/lib/utils";
import { SITE_URL } from "@/lib/constants";
import type { Party, PartyGuest } from "@/types";

export const metadata: Metadata = { robots: { index: false, follow: false } };

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function PartyDashboardPage({ params }: PageProps) {
  const { id } = await params;
  const locale = await getLocale();
  const isRTL = locale === "ar";
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/parties/${id}`);

  const { data: party } = await supabase
    .from("parties")
    .select("*")
    .eq("id", id)
    .eq("host_id", user.id)
    .single();

  if (!party) notFound();

  const { data: guestRows } = await supabase
    .from("party_guests")
    .select("*")
    .eq("party_id", id)
    .order("created_at", { ascending: true });

  const typedParty = party as Party;
  const guests = (guestRows ?? []) as PartyGuest[];
  // en has a /en prefix (localePrefix: "as-needed"), ar (default) has none.
  const rsvpBaseUrl = `${SITE_URL}${locale === "en" ? "/en" : ""}/rsvp`;

  return (
    <div className="min-h-screen bg-brand-warm-white">
      <Navbar />

      <div className="max-w-lg mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold tracking-tight text-brand-midnight">{typedParty.title}</h1>
        <div className="flex items-center gap-1.5 text-sm text-brand-ink/55 mt-2">
          <CalendarDays size={14} />
          {formatDateTime(typedParty.starts_at, isRTL ? "ar-SA" : "en-US")}
        </div>
        {typedParty.location_name && (
          <div className="flex items-center gap-1.5 text-sm text-brand-ink/55 mt-1">
            <MapPin size={14} />
            {typedParty.location_name}
          </div>
        )}

        <div className="mt-8">
          <GuestManager
            partyId={typedParty.id}
            partyTitle={typedParty.title}
            initialGuests={guests}
            rsvpBaseUrl={rsvpBaseUrl}
            isRTL={isRTL}
          />
        </div>
      </div>
    </div>
  );
}
