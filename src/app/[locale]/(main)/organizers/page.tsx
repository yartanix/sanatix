import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { Search } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import OrganizerCard from "@/components/organizers/OrganizerCard";
import type { Profile } from "@/types";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function OrganizersPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const t = await getTranslations();
  const supabase = await createClient();

  // profiles has no "I organize events" flag of its own — an organizer is
  // simply anyone with at least one published event. Count per organizer
  // first, then fetch just those profiles (never the whole table).
  const { data: eventRows } = await supabase
    .from("events")
    .select("organizer_id")
    .eq("status", "published");

  const counts = new Map<string, number>();
  for (const row of eventRows ?? []) {
    counts.set(row.organizer_id, (counts.get(row.organizer_id) ?? 0) + 1);
  }
  const organizerIds = Array.from(counts.keys());

  let organizers: Profile[] = [];
  if (organizerIds.length > 0) {
    let query = supabase.from("profiles").select("*").in("id", organizerIds);
    if (q) query = query.ilike("full_name", `%${q}%`);
    const { data } = await query;
    organizers = ((data ?? []) as Profile[]).sort(
      (a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0)
    );
  }

  return (
    <div className="min-h-screen bg-brand-warm-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-medium text-brand-midnight mb-2">{t("organizers.title")}</h1>
          <p className="text-brand-ink/55 text-sm">{t("organizers.subtitle")}</p>
        </div>

        <form action="/organizers" method="GET" className="relative max-w-xl mb-8">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-brand-ink/35 w-4 h-4" />
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder={t("organizers.searchPlaceholder")}
            className="w-full ps-11 pe-4 py-3 rounded-xl border border-black/10 bg-white text-sm text-brand-midnight placeholder:text-brand-ink/35 focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
          />
        </form>

        {organizers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-black/5 p-16 text-center">
            <p className="text-brand-ink/60 text-sm mb-1">{t("organizers.empty")}</p>
            <p className="text-brand-ink/40 text-xs">{t("organizers.emptyHint")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {organizers.map((organizer) => (
              <OrganizerCard key={organizer.id} organizer={organizer} eventCount={counts.get(organizer.id) ?? 0} t={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
