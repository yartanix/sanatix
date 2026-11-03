import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import Navbar from "@/components/layout/Navbar";
import CreatePartyForm from "@/components/party/CreatePartyForm";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function NewPartyPage() {
  const locale = await getLocale();
  const isRTL = locale === "ar";
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/parties/new`);

  return (
    <div className="min-h-screen bg-brand-warm-white">
      <Navbar />
      <div className="max-w-lg mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold tracking-tight text-brand-midnight mb-1">
          {isRTL ? "حفلة جديدة" : "New Party"}
        </h1>
        <p className="text-sm text-brand-ink/55 mb-8">
          {isRTL ? "بعد الإنشاء، أضف الضيوف وشارك دعواتهم" : "After creating it, you'll add guests and share their invites"}
        </p>
        <CreatePartyForm isRTL={isRTL} />
      </div>
    </div>
  );
}
