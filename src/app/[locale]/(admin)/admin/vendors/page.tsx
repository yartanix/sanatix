import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { MapPin, Globe, Instagram } from "lucide-react";
import VendorReviewActions from "@/components/admin/VendorReviewActions";
import { VENDOR_CATEGORY_LABEL } from "@/lib/constants";

export const metadata = { title: "Vendor Review - Sanatix Admin" };

interface VendorRow {
  id: string;
  name_ar: string;
  name_en: string;
  description_en: string | null;
  description_ar: string | null;
  category: string;
  city: string;
  logo_url: string | null;
  website_url: string | null;
  instagram_url: string | null;
  source_url: string | null;
  agent_generated: boolean;
  created_at: string;
}

export default async function AdminVendorsPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const isRTL = locale === "ar";

  const { data } = await supabase
    .from("vendors")
    .select("id, name_ar, name_en, description_en, description_ar, category, city, logo_url, website_url, instagram_url, source_url, agent_generated, created_at")
    .eq("is_verified", false)
    .order("created_at", { ascending: true });
  const vendors = (data ?? []) as VendorRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">
          {isRTL ? "مراجعة الموردين" : "Vendor Review"}
        </h1>
        <p className="text-sm text-white/40 mt-1">
          {isRTL
            ? `${vendors.length} مورد بانتظار المراجعة`
            : `${vendors.length} vendor${vendors.length === 1 ? "" : "s"} waiting for review`}
        </p>
      </div>

      {vendors.length === 0 ? (
        <div className="bg-[#141414] rounded-2xl border border-white/8 p-12 text-center">
          <p className="text-sm text-white/40">
            {isRTL ? "لا يوجد موردون بانتظار المراجعة" : "Nothing waiting for review"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {vendors.map((vendor) => {
            const name = isRTL ? vendor.name_ar : vendor.name_en;
            const description = isRTL ? vendor.description_ar : vendor.description_en;
            const categoryLabel = VENDOR_CATEGORY_LABEL[vendor.category]?.[isRTL ? "ar" : "en"] ?? vendor.category;

            return (
              <div key={vendor.id} className="bg-[#141414] rounded-2xl border border-white/8 p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0">
                    {vendor.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={vendor.logo_url} alt={name} className="w-11 h-11 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400 font-medium shrink-0">
                        {name?.charAt(0) ?? "V"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-white text-sm">{name}</p>
                        {vendor.agent_generated && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-400/10 text-sky-300">
                            {isRTL ? "من الوكيل" : "agent-found"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/40 mt-0.5 capitalize">
                        <span>{categoryLabel}</span>
                        <span className="flex items-center gap-1">
                          <MapPin size={10} /> {vendor.city}
                        </span>
                      </div>
                      {description && (
                        <p className="text-xs text-white/50 mt-2 leading-relaxed line-clamp-2 max-w-xl">{description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        {vendor.website_url && (
                          <a href={vendor.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-white/40 hover:text-amber-400">
                            <Globe size={11} /> {isRTL ? "الموقع" : "Website"}
                          </a>
                        )}
                        {vendor.instagram_url && (
                          <a href={vendor.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-white/40 hover:text-amber-400">
                            <Instagram size={11} /> Instagram
                          </a>
                        )}
                        {vendor.source_url && (
                          <a href={vendor.source_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-white/30 hover:text-amber-400 underline">
                            {new URL(vendor.source_url).hostname}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <VendorReviewActions vendorId={vendor.id} isRTL={isRTL} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
