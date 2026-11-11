import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CrowdfundingCampaign } from "@/types";

export const metadata = { title: "Crowdfunding - Sanatix" };

export default async function OrganizerCampaignsPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const isRTL = locale === "ar";
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/" + locale + "/login");

  const { data } = await supabase
    .from("campaigns")
    .select("*")
    .eq("organizer_id", user.id)
    .order("created_at", { ascending: false });

  const campaigns = (data ?? []) as CrowdfundingCampaign[];

  const statusLabel: Record<string, { ar: string; en: string; cls: string }> = {
    active:    { ar: "نشطة",   en: "Active",   cls: "bg-emerald-50 text-emerald-600" },
    funded:    { ar: "تم التمويل", en: "Funded", cls: "bg-blue-50 text-blue-600" },
    expired:   { ar: "منتهية", en: "Expired",  cls: "bg-black/5 text-brand-ink/40" },
    cancelled: { ar: "ملغاة",  en: "Cancelled", cls: "bg-rose-50 text-rose-600" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-midnight">
            {isRTL ? "حملات التمويل الجماعي" : "Crowdfunding Campaigns"}
          </h1>
          <p className="text-sm text-brand-ink/50 mt-1">
            {isRTL ? "أنشئ وتابع حملاتك" : "Create and track your campaigns"}
          </p>
        </div>
        <Link
          href="/organizer/campaigns/new"
          className="px-4 py-2.5 bg-brand-gold text-white text-sm font-medium rounded-xl hover:bg-brand-gold/90 transition-colors"
        >
          {isRTL ? "+ حملة جديدة" : "+ New Campaign"}
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/5 p-10 text-center text-sm text-brand-ink/50">
          {isRTL ? "لا توجد حملات بعد" : "No campaigns yet"}
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const title = isRTL ? c.title_ar : c.title_en;
            const pct = c.goal_amount > 0 ? Math.min(100, Math.round((c.raised_amount / c.goal_amount) * 100)) : 0;
            const st = statusLabel[c.status] ?? statusLabel.active;
            return (
              <Link
                key={c.id}
                href={`/organizer/campaigns/${c.id}` as "/organizer/campaigns/new"}
                className="block bg-white rounded-2xl border border-black/5 p-5 hover:border-brand-gold/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-brand-midnight">{title}</p>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${st.cls}`}>
                    {isRTL ? st.ar : st.en}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-black/5 overflow-hidden mb-2">
                  <div className="h-full bg-brand-gold" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs text-brand-ink/50">
                  <span>
                    {formatCurrency(c.raised_amount, c.currency, isRTL ? "ar-SA" : "en-US")} / {formatCurrency(c.goal_amount, c.currency, isRTL ? "ar-SA" : "en-US")}
                  </span>
                  <span>{isRTL ? "الموعد النهائي" : "Deadline"} {formatDate(c.deadline, isRTL ? "ar-SA" : "en-US")}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
