import { createClient } from "@/lib/supabase/server";
import { getLocale, getTranslations } from "next-intl/server";
import Navbar from "@/components/layout/Navbar";
import CampaignCard from "@/components/crowdfunding/CampaignCard";
import type { CrowdfundingCampaign } from "@/types";

export default async function CrowdfundingPage() {
  const locale = await getLocale();
  const t = await getTranslations();
  const supabase = await createClient();

  const [{ data: activeRows }, { data: resolvedRows }] = await Promise.all([
    supabase.from("campaigns").select("*").eq("status", "active").order("created_at", { ascending: false }),
    supabase
      .from("campaigns")
      .select("*")
      .in("status", ["funded", "expired"])
      .order("updated_at", { ascending: false })
      .limit(12),
  ]);
  const active = (activeRows ?? []) as CrowdfundingCampaign[];
  const resolved = (resolvedRows ?? []) as CrowdfundingCampaign[];

  return (
    <div className="min-h-screen bg-brand-warm-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-medium text-brand-midnight mb-2">{t("crowdfunding.title")}</h1>
          <p className="text-brand-ink/55 text-sm">{t("crowdfunding.subtitle")}</p>
        </div>

        {active.length === 0 ? (
          <div className="bg-white rounded-2xl border border-black/5 p-16 text-center mb-10">
            <p className="text-brand-ink/60 text-sm mb-1">{t("crowdfunding.empty")}</p>
            <p className="text-brand-ink/40 text-xs">{t("crowdfunding.emptyHint")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-12">
            {active.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} locale={locale} t={t} />
            ))}
          </div>
        )}

        {resolved.length > 0 && (
          <div>
            <h2 className="text-lg font-medium text-brand-midnight mb-4">{t("crowdfunding.pastCampaigns")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 opacity-80">
              {resolved.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} locale={locale} t={t} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
