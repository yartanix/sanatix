import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { redirect, notFound } from "next/navigation";
import CampaignForm from "@/components/organizer/CampaignForm";
import { formatCurrency } from "@/lib/utils";
import type { CrowdfundingCampaign } from "@/types";

export const metadata = { title: "Campaign - Sanatix" };

export default async function OrganizerCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const locale = await getLocale();
  const isRTL = locale === "ar";
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/" + locale + "/login");

  const { data } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("organizer_id", user.id)
    .single();

  if (!data) notFound();
  const campaign = data as CrowdfundingCampaign;

  return (
    <div className="space-y-6">
      <div className="max-w-2xl grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-black/5 p-5">
          <p className="text-2xl font-semibold text-brand-midnight">{formatCurrency(campaign.raised_amount, campaign.currency, isRTL ? "ar-SA" : "en-US")}</p>
          <p className="text-xs text-brand-ink/50 mt-1">{isRTL ? "تم جمعه" : "Raised"}</p>
        </div>
        <div className="bg-white rounded-2xl border border-black/5 p-5">
          <p className="text-2xl font-semibold text-brand-midnight">{campaign.backer_count}</p>
          <p className="text-xs text-brand-ink/50 mt-1">{isRTL ? "داعمون" : "Backers"}</p>
        </div>
        <div className="bg-white rounded-2xl border border-black/5 p-5">
          <p className="text-sm font-semibold text-brand-midnight capitalize">{campaign.status}</p>
          <p className="text-xs text-brand-ink/50 mt-1">{isRTL ? "الحالة" : "Status"}</p>
        </div>
      </div>

      <CampaignForm isRTL={isRTL} initialData={campaign} />
    </div>
  );
}
