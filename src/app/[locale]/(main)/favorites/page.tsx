import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { Calendar, MapPin, Heart } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { Link } from "@/i18n/routing";
import { formatDate } from "@/lib/utils";

interface FavoriteRow {
  id: string;
  events: {
    id: string;
    title_ar: string;
    title_en: string;
    starts_at: string;
    venue_city: string | null;
    cover_image: string | null;
    status: string;
  } | null;
}

export default async function FavoritesPage() {
  const locale = await getLocale();
  const supabase = await createClient();
  const isRTL = locale === "ar";

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/favorites`);

  const { data: favorites } = await supabase
    .from("favorites")
    .select("id, events(id, title_ar, title_en, starts_at, venue_city, cover_image, status)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const rows = (favorites ?? []) as unknown as FavoriteRow[];
  const saved = rows.filter((f) => f.events && f.events.status === "published");

  return (
    <div className="min-h-screen bg-brand-warm-white">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-medium text-brand-midnight mb-8">
          {isRTL ? "الفعاليات المحفوظة" : "Saved Events"}
        </h1>

        {saved.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-brand-sand flex items-center justify-center mx-auto mb-4">
              <Heart size={24} className="text-brand-ink/30" />
            </div>
            <p className="text-brand-ink/50 mb-4">
              {isRTL ? "لم تحفظ أي فعاليات بعد" : "You haven't saved any events yet"}
            </p>
            <Link href="/events" className="text-sm text-brand-gold hover:underline">
              {isRTL ? "استكشف الفعاليات" : "Browse events"}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {saved.map((f) => {
              const ev = f.events!;
              const title = locale === "ar" ? ev.title_ar : ev.title_en;
              return (
                <Link key={f.id} href={`/events/${ev.id}`}>
                  <div className="bg-white rounded-2xl border border-black/5 p-5 flex gap-4 hover:shadow-md transition-shadow">
                    <div className="w-20 h-20 rounded-xl bg-brand-sand shrink-0 overflow-hidden">
                      {ev.cover_image && (
                        <img src={ev.cover_image} alt={title} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-brand-midnight text-sm mb-2 line-clamp-1">{title}</h3>
                      <div className="flex items-center gap-3 text-xs text-brand-ink/40">
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {formatDate(ev.starts_at, isRTL ? "ar-SA" : "en-US")}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={10} />
                          {ev.venue_city}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
