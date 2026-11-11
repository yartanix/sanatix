import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import VendorReviewsList from "@/components/vendor/VendorReviewsList";

export const metadata = { title: "Reviews - Sanatix" };

export default async function VendorReviewsPage() {
  const supabase = await createClient();
  const locale = await getLocale();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: vendors } = await supabase.from("vendors").select("id").eq("owner_id", user.id);
  const vendorIds = (vendors ?? []).map((v) => v.id);

  const { data: reviews } = vendorIds.length
    ? await supabase
        .from("reviews")
        .select("*, profiles(full_name, avatar_url)")
        .in("vendor_id", vendorIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  return <VendorReviewsList locale={locale} initialReviews={reviews ?? []} />;
}
