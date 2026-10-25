import { Link } from "@/i18n/routing";
import { Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { CrowdfundingCampaign } from "@/types";

interface CampaignCardProps {
  campaign: CrowdfundingCampaign;
  locale: string;
  t: (key: string) => string;
}

export default function CampaignCard({ campaign, locale, t }: CampaignCardProps) {
  const isRTL = locale === "ar";
  const title = isRTL ? campaign.title_ar : campaign.title_en;
  const pct = Math.min(100, Math.round((campaign.raised_amount / campaign.goal_amount) * 100));
  const daysLeft = Math.max(0, Math.ceil((new Date(campaign.deadline).getTime() - Date.now()) / 86_400_000));
  const nf = (n: number) => formatCurrency(n, campaign.currency, isRTL ? "ar-SA" : "en-US");

  return (
    <Link href={`/crowdfunding/${campaign.id}`} className="group block">
      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all h-full">
        <div className="h-36 bg-brand-sand relative overflow-hidden">
          {campaign.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={campaign.cover_image} alt={title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-12 h-12 rounded-xl bg-brand-gold/10 flex items-center justify-center text-brand-gold text-lg font-medium">
                {title?.charAt(0) ?? "C"}
              </div>
            </div>
          )}
          {campaign.status === "funded" && (
            <span className="absolute top-3 start-3 text-xs bg-emerald-500/90 text-white px-2.5 py-1 rounded-full font-medium">
              {t("crowdfunding.funded")}
            </span>
          )}
          {campaign.status === "expired" && (
            <span className="absolute top-3 start-3 text-xs bg-brand-ink/60 text-white px-2.5 py-1 rounded-full font-medium">
              {t("crowdfunding.ended")}
            </span>
          )}
        </div>

        <div className="p-4 space-y-3">
          <h3 className="font-medium text-brand-midnight text-sm leading-snug line-clamp-2">{title}</h3>

          <div className="h-1.5 rounded-full bg-brand-sand overflow-hidden">
            <div className="h-full bg-brand-gold rounded-full" style={{ width: `${pct}%` }} />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-brand-midnight">{nf(campaign.raised_amount)}</span>
            <span className="text-brand-ink/45">{pct}% {t("crowdfunding.funded").toLowerCase()}</span>
          </div>

          <div className="flex items-center justify-between text-xs text-brand-ink/45">
            <span className="flex items-center gap-1">
              <Users size={11} /> {campaign.backer_count} {t("crowdfunding.backers")}
            </span>
            <span>
              {campaign.status === "active"
                ? `${daysLeft} ${t("crowdfunding.daysLeft")}`
                : `${t("crowdfunding.goal")}: ${nf(campaign.goal_amount)}`}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
