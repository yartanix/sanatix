import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { MessageSquare, Star, BadgeCheck, Store } from "lucide-react";

export const metadata = { title: "Supplier Hub - Sanatix" };

export default async function VendorDashboard() {
  const supabase = await createClient();
  const locale = await getLocale();
  const isRTL = locale === "ar";
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/" + locale + "/login");

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id, name_ar, name_en, is_verified, rating, review_count")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let newInquiries = 0;
  if (vendor) {
    const { count } = await supabase
      .from("vendor_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendor.id)
      .eq("status", "new");
    newInquiries = count ?? 0;
  }

  if (!vendor) {
    return (
      <div className="max-w-xl">
        <div className="bg-white rounded-2xl border border-black/5 p-8 text-center">
          <Store size={28} className="mx-auto text-brand-ink/30 mb-3" />
          <h1 className="text-lg font-semibold text-brand-midnight mb-1">
            {isRTL ? "لا يوجد ملف تجاري بعد" : "No vendor profile yet"}
          </h1>
          <p className="text-sm text-brand-ink/50">
            {isRTL
              ? "تواصل مع فريق سناتيكس لإضافة نشاطك التجاري كمورد."
              : "Contact the Sanatix team to get your business added as a vendor."}
          </p>
        </div>
      </div>
    );
  }

  const name = isRTL ? vendor.name_ar : vendor.name_en;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-brand-midnight">{name}</h1>
          {vendor.is_verified && <BadgeCheck size={18} className="text-emerald-500" />}
        </div>
        <p className="text-sm text-brand-ink/50 mt-1">
          {isRTL ? "مرحبًا بك في لوحة تحكم المورد" : "Welcome to your supplier dashboard"}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Link href="/vendor/inquiries" className="bg-white rounded-2xl border border-black/5 p-5 hover:border-brand-gold/30 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <MessageSquare size={16} className="text-brand-gold" />
            {newInquiries > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold">
                {isRTL ? "جديد" : "NEW"}
              </span>
            )}
          </div>
          <p className="text-2xl font-semibold text-brand-midnight">{newInquiries}</p>
          <p className="text-xs text-brand-ink/50 mt-1">{isRTL ? "استفسارات جديدة" : "New inquiries"}</p>
        </Link>

        <Link href="/vendor/reviews" className="bg-white rounded-2xl border border-black/5 p-5 hover:border-brand-gold/30 transition-colors">
          <Star size={16} className="text-amber-500 mb-2" />
          <p className="text-2xl font-semibold text-brand-midnight">{vendor.rating ? Number(vendor.rating).toFixed(1) : "—"}</p>
          <p className="text-xs text-brand-ink/50 mt-1">
            {isRTL ? `${vendor.review_count} تقييم` : `${vendor.review_count} reviews`}
          </p>
        </Link>

        <Link href="/vendor/profile" className="bg-white rounded-2xl border border-black/5 p-5 hover:border-brand-gold/30 transition-colors">
          <Store size={16} className="text-blue-500 mb-2" />
          <p className="text-sm font-semibold text-brand-midnight">
            {vendor.is_verified ? (isRTL ? "موثّق" : "Verified") : (isRTL ? "قيد المراجعة" : "Pending review")}
          </p>
          <p className="text-xs text-brand-ink/50 mt-1">{isRTL ? "تعديل الملف التجاري" : "Edit vendor profile"}</p>
        </Link>
      </div>
    </div>
  );
}
