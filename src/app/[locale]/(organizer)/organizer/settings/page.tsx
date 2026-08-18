import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import SettingsForm from "@/components/organizer/SettingsForm";

export const metadata = { title: "Settings - Sanatix" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const locale = await getLocale();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  return <SettingsForm locale={locale} initialData={profile ?? {}} email={user.email ?? ""} />;
}
