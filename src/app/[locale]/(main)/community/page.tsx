import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import Navbar from "@/components/layout/Navbar";
import DirectoryBrowser from "@/components/community/DirectoryBrowser";
import type { DirectoryProfile } from "@/types";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function CommunityPage() {
  const locale = await getLocale();
  const isRTL = locale === "ar";
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/community`);

  // directory_profiles (migration 021) is the narrow, phone-free view the
  // app is expected to query for the directory -- the open-to-all-users
  // product decision, with messaging gated separately in users_share_event().
  const { data } = await supabase
    .from("directory_profiles")
    .select("*")
    .neq("id", user.id)
    .order("full_name", { ascending: true, nullsFirst: false })
    .limit(100);

  const profiles = (data ?? []) as DirectoryProfile[];

  return (
    <div className="min-h-screen bg-brand-warm-white">
      <Navbar />

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-brand-midnight">
            {isRTL ? "المجتمع" : "Community"}
          </h1>
          <p className="text-sm text-brand-ink/55 mt-1">
            {isRTL
              ? "تصفح جميع مستخدمي سناتيكس. يمكنك مراسلة من تشاركه فعالية أو حفلة فقط."
              : "Browse every Sanatix account. You can only message someone you share an event or party with."}
          </p>
        </div>

        <DirectoryBrowser initialProfiles={profiles} isRTL={isRTL} />
      </div>
    </div>
  );
}
