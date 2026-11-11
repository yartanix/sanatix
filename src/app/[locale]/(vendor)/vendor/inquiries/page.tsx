import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import VendorInquiriesList from "@/components/vendor/VendorInquiriesList";

export const metadata = { title: "Inquiries - Sanatix" };

export default async function VendorInquiriesPage() {
  const supabase = await createClient();
  const locale = await getLocale();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: vendors } = await supabase.from("vendors").select("id").eq("owner_id", user.id);
  const vendorIds = (vendors ?? []).map((v) => v.id);

  const { data: inquiries } = vendorIds.length
    ? await supabase
        .from("vendor_inquiries")
        .select("*")
        .in("vendor_id", vendorIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  return <VendorInquiriesList locale={locale} initialInquiries={inquiries ?? []} />;
}
