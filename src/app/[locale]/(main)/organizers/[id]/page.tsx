import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { MapPin, CalendarDays, ArrowLeft, ArrowRight } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import EventCard from "@/components/events/EventCard";
import CampaignCard from "@/components/crowdfunding/CampaignCard";
import { Link } from "@/i18n/routing";
import type { Profile, Event, CrowdfundingCampaign } from "@/types";

interface OrganizerPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function OrganizerPage({ params }: OrganizerPageProps) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getTranslations();
  const isRTL = locale === "ar";
  const supabase = await createClient();

  const { data: profileData } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (!profileData) notFound();
  const organizer = profileData as Profile;

  const [{ data: eventRows }, { data: campaignRows }] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .eq("organizer_id", id)
      .eq("status", "published")
      .order("starts_at", { ascending: true }),
    supabase
      .from("campaigns")
      .select("*")
      .eq("organizer_id", id)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);
  const allEvents = (eventRows ?? []) as Event[];
  const campaigns = (campaignRows ?? []) as CrowdfundingCampaign[];

  // An organizer with zero published events and no profile beyond the
  // default row isn't really "an organizer" yet — keep /organizers/[id]
  // from being a way to browse arbitrary customer accounts.
  if (allEvents.length === 0 && campaigns.length === 0) notFound();

  const now = new Date().toISOString();
  const upcoming = allEvents.filter((e) => e.starts_at >= now);
  const past = allEvents.filter((e) => e.starts_at < now);

  const name = organizer.full_name ?? t("organizers.unnamed");
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-brand-warm-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <Link href="/organizers" className="inline-flex items-center gap-1.5 text-xs text-brand-ink/50 hover:text-brand-gold mb-6">
          <BackIcon size={13} /> {t("organizers.backToOrganizers")}
        </Link>

        <div className="flex items-center gap-4 mb-10">
          {organizer.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={organizer.avatar_url} alt={name} className="w-20 h-20 rounded-2xl object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-brand-gold/10 flex items-center justify-center text-brand-gold text-2xl font-medium">
              {name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-2xl md:text-3xl font-medium text-brand-midnight">{name}</h1>
            <div className="flex items-center gap-4 text-sm text-brand-ink/50 mt-1.5">
              {organizer.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-brand-gold" /> {organizer.city}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <CalendarDays size={13} className="text-brand-gold" />
                {allEvents.length} {t("organizers.eventsHosted")}
              </span>
            </div>
          </div>
        </div>

        {campaigns.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-medium text-brand-midnight mb-4">{t("organizers.activeCampaigns")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {campaigns.map((c) => (
                <CampaignCard key={c.id} campaign={c} locale={locale} t={t} />
              ))}
            </div>
          </div>
        )}

        <div className="mb-10">
          <h2 className="text-lg font-medium text-brand-midnight mb-4">{t("organizers.upcomingEvents")}</h2>
          {upcoming.length === 0 ? (
            <div className="bg-white rounded-2xl border border-black/5 p-8 text-center text-sm text-brand-ink/50">
              {t("organizers.noUpcoming")}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {upcoming.map((event) => <EventCard key={event.id} event={event} />)}
            </div>
          )}
        </div>

        {past.length > 0 && (
          <div>
            <h2 className="text-lg font-medium text-brand-midnight mb-4">{t("organizers.pastEvents")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 opacity-70">
              {past.slice(0, 6).map((event) => <EventCard key={event.id} event={event} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
