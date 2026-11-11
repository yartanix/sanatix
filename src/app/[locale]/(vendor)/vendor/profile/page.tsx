import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import VendorProfileForm from "@/components/vendor/VendorProfileForm";

export const metadata = { title: "Vendor Profile - Sanatix" };

export default async function VendorProfilePage() {
  const supabase = await createClient();
  const locale = await getLocale();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: vendor } = await supabase
    .from("vendors")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return <VendorProfileForm locale={locale} initialData={vendor} />;
}
