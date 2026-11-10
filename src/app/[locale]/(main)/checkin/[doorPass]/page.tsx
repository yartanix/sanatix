import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import CheckinScanner from "@/components/party/CheckinScanner";
import { formatDateTime } from "@/lib/utils";

interface PageProps {
  params: Promise<{ locale: string; doorPass: string }>;
}

export const metadata: Metadata = { robots: { index: false, follow: false } };

// No auth — same "the link is the credential" model as the RSVP page,
// scoped by get_door_pass_party (migration 015) to exactly one party's
// name and start time. It can never list guests.
export default async function CheckinPage({ params }: PageProps) {
  const { doorPass } = await params;
  const locale = await getLocale();
  const isRTL = locale === "ar";
  const supabase = await createClient();

  const { data: rawData } = await supabase.rpc("get_door_pass_party", { door_pass: doorPass }).maybeSingle();
  const data = rawData as { party_id: string; title: string; starts_at: string } | null;

  if (!data) {
    return (
      <main className="min-h-screen bg-brand-warm-white flex items-center justify-center px-6">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-lg font-semibold text-brand-midnight">
            {isRTL ? "لم يتم العثور على رابط الباب" : "Door link not found"}
          </p>
          <Link href="/" className="inline-block text-sm font-semibold text-brand-gold hover:underline">
            {isRTL ? "الذهاب إلى سناتيكس" : "Go to Sanatix"}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-warm-white flex flex-col">
      <div
        className="relative overflow-hidden text-center px-6 pt-16 pb-14"
        style={{
          background:
            "radial-gradient(900px 500px at 82% -10%, rgba(200,151,58,0.30), transparent 60%)," +
            "linear-gradient(180deg, #0F0F14 0%, #0F0F14 70%, #17151C 100%)",
        }}
      >
        <p className="text-xs font-semibold tracking-wide text-brand-gold-light uppercase mb-3">
          {isRTL ? "تسجيل الدخول عند الباب" : "Door check-in"}
        </p>
        <h1 className="max-w-md mx-auto text-2xl sm:text-3xl font-extrabold tracking-tight text-brand-warm-white leading-tight">
          {data.title}
        </h1>
        <p className="text-sm text-brand-warm-white/60 mt-2">{formatDateTime(data.starts_at, isRTL ? "ar-SA" : "en-US")}</p>
      </div>

      <div className="flex-1 px-6 -mt-8">
        <div className="max-w-sm mx-auto bg-white rounded-3xl border border-black/5 shadow-[0_18px_40px_-18px_rgba(15,15,20,0.22)] p-6">
          <CheckinScanner doorPass={doorPass} isRTL={isRTL} />
        </div>
      </div>
    </main>
  );
}
