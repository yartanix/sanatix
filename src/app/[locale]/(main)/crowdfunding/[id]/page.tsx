import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Users, Calendar, ArrowLeft, ArrowRight } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import PledgeForm from "@/components/crowdfunding/PledgeForm";
import { Link } from "@/i18n/routing";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CrowdfundingCampaign, Profile, Event } from "@/types";

interface CampaignPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function CampaignPage({ params }: CampaignPageProps) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getTranslations();
  const isRTL = locale === "ar";
  const supabase = await createClient();

  const { data } = await supabase.from("campaigns").select("*").eq("id", id).single();
  if (!data) notFound();
  const campaign = data as CrowdfundingCampaign;

  const [{ data: organizerData }, { data: eventData }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", campaign.organizer_id).single(),
    campaign.event_id
      ? supabase.from("events").select("*").eq("id", campaign.event_id).single()
      : Promise.resolve({ data: null }),
  ]);
  const organizer = organizerData as Profile | null;
  const linkedEvent = eventData as Event | null;

  const title = isRTL ? campaign.title_ar : campaign.title_en;
  const description = isRTL ? campaign.description_ar : campaign.description_en;
  const pct = Math.min(100, Math.round((campaign.raised_amount / campaign.goal_amount) * 100));
  const daysLeft = Math.max(0, Math.ceil((new Date(campaign.deadline).getTime() - Date.now()) / 86_400_000));
  const nf = (n: number) => formatCurrency(n, campaign.currency, isRTL ? "ar-SA" : "en-US");
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const statusLabel =
    campaign.status === "funded" ? t("crowdfunding.funded")
    : campaign.status === "expired" ? t("crowdfunding.ended")
    : campaign.status === "cancelled" ? t("crowdfunding.cancelled")
    : null;

  return (
    <div className="min-h-screen bg-brand-warm-white">
      <Navbar />

      <div className="w-full h-56 md:h-80 bg-brand-sand relative overflow-hidden">
        {campaign.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={campaign.cover_image} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="60" height="60" viewBox="0 0 34 34" fill="none" opacity="0.15">
              <circle cx="6"  cy="28" r="3"   fill="#C8973A"/>
              <circle cx="16" cy="18" r="4.5" fill="#C8973A"/>
              <circle cx="28" cy="6"  r="6"   fill="#C8973A"/>
            </svg>
          </div>
        )}
        {statusLabel && (
          <div className="absolute bottom-4 start-4">
            <span className="bg-brand-midnight/80 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">{statusLabel}</span>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link href="/crowdfunding" className="inline-flex items-center gap-1.5 text-xs text-brand-ink/50 hover:text-brand-gold mb-4">
          <BackIcon size={13} /> {t("crowdfunding.backToCampaigns")}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-medium text-brand-midnight leading-snug">{title}</h1>
              {organizer && (
                <Link href={`/organizers/${organizer.id}`} className="text-sm text-brand-ink/55 hover:text-brand-gold mt-2 inline-block">
                  {isRTL ? "بواسطة" : "by"} {organizer.full_name ?? t("organizers.unnamed")}
                </Link>
              )}
            </div>

            {description && (
              <div>
                <h2 className="text-lg font-medium text-brand-midnight mb-3">{t("crowdfunding.about")}</h2>
                <p className="text-sm text-brand-ink/70 leading-relaxed whitespace-pre-line">{description}</p>
              </div>
            )}

            {linkedEvent && (
              <div>
                <h2 className="text-lg font-medium text-brand-midnight mb-3">{t("crowdfunding.relatedEvent")}</h2>
                <Link
                  href={`/events/${linkedEvent.id}`}
                  className="flex items-center gap-3 bg-white rounded-2xl border border-black/5 p-4 hover:border-brand-gold/40 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-gold/10 flex items-center justify-center shrink-0">
                    <Calendar size={16} className="text-brand-gold" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-brand-midnight">
                      {isRTL ? linkedEvent.title_ar : linkedEvent.title_en}
                    </p>
                    <p className="text-xs text-brand-ink/50">{formatDate(linkedEvent.starts_at, isRTL ? "ar-SA" : "en-US")}</p>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* Progress + pledge sidebar */}
          <aside className="space-y-4">
            <div className="bg-white rounded-2xl border border-black/5 p-5 space-y-3">
              <div className="h-2 rounded-full bg-brand-sand overflow-hidden">
                <div className="h-full bg-brand-gold rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <div>
                <p className="text-2xl font-semibold text-brand-midnight">{nf(campaign.raised_amount)}</p>
                <p className="text-xs text-brand-ink/50 mt-0.5">
                  {pct}% {t("crowdfunding.ofGoal")} {nf(campaign.goal_amount)}
                </p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-black/5 text-sm">
                <span className="flex items-center gap-1.5 text-brand-ink/60">
                  <Users size={14} className="text-brand-gold" /> {campaign.backer_count} {t("crowdfunding.backers")}
                </span>
                <span className="text-brand-ink/60">
                  {campaign.status === "active"
                    ? `${daysLeft} ${t("crowdfunding.daysLeft")}`
                    : formatDate(campaign.deadline, isRTL ? "ar-SA" : "en-US")}
                </span>
              </div>
            </div>

            <PledgeForm campaignId={campaign.id} currency={campaign.currency} isRTL={isRTL} />
          </aside>
        </div>
      </div>
    </div>
  );
}
