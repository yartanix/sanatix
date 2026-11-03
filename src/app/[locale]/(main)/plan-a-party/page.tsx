import { createClient } from "@/lib/supabase/server";
import { getLocale, getTranslations } from "next-intl/server";
import { PartyPopper, ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import Navbar from "@/components/layout/Navbar";
import PartyPlannerForm from "@/components/party/PartyPlannerForm";
import VenueCard from "@/components/venues/VenueCard";
import VendorCard from "@/components/vendors/VendorCard";
import { PARTY_NEEDS, ageLabel, budgetLabel, needLabel } from "@/lib/party-planner";
import type { Venue, Vendor } from "@/types";

interface PageProps {
  searchParams: Promise<{ age?: string; city?: string; budget?: string; needs?: string }>;
}

export default async function PlanAPartyPage({ searchParams }: PageProps) {
  const { age, city, budget, needs } = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations();
  const isRTL = locale === "ar";
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  // No city yet = show the wizard. City is the one hard requirement since
  // every query below is scoped to it.
  if (!city) {
    return (
      <div className="min-h-screen bg-brand-warm-white">
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-[#8A5E12] bg-brand-gold/10 border border-brand-gold/30 rounded-full px-4 py-2 mb-5">
              <PartyPopper size={13} />
              {isRTL ? "تخطيط الحفلات" : "Party Planner"}
            </span>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-brand-midnight mb-3">
              {isRTL ? "خطط لحفلة طفلك المثالية" : "Plan your child's perfect party"}
            </h1>
            <p className="text-brand-ink/55 text-sm">
              {isRTL
                ? "أجب عن بضعة أسئلة ونقترح عليك أفضل القاعات والموردين"
                : "Answer a few quick questions and we'll match you with the right venues and vendors"}
            </p>
          </div>
          <PartyPlannerForm isRTL={isRTL} />
        </div>
      </div>
    );
  }

  const selectedNeeds = (needs ?? "").split(",").filter(Boolean);
  const wantsVenue = selectedNeeds.includes("venue");
  const vendorCategories = selectedNeeds
    .map((key) => PARTY_NEEDS.find((n) => n.key === key)?.vendorCategory)
    .filter((c): c is string => Boolean(c));

  const supabase = await createClient();

  const [{ data: venueRows }, vendorResults] = await Promise.all([
    wantsVenue
      ? supabase
          .from("venues")
          .select("*")
          .eq("city", city)
          .eq("is_published", true)
          .limit(20)
      : Promise.resolve({ data: [] as Venue[] }),
    Promise.all(
      vendorCategories.map((category) =>
        supabase
          .from("vendors")
          .select("*")
          .eq("city", city)
          .eq("category", category)
          .eq("is_verified", true)
          .order("is_featured", { ascending: false })
          .order("rating", { ascending: false })
          .limit(4)
          .then((res) => ({ category, vendors: (res.data ?? []) as Vendor[] }))
      )
    ),
  ]);

  // Kids' play centers first, then everything else — still show other
  // published venues in the city rather than hiding them, since not every
  // family wants a dedicated play center.
  const venues = ((venueRows ?? []) as Venue[])
    .sort((a, b) => (a.venue_type === "kids_play_center" ? -1 : 0) - (b.venue_type === "kids_play_center" ? -1 : 0))
    .slice(0, 6);

  const editHref = `/plan-a-party`;

  return (
    <div className="min-h-screen bg-brand-warm-white">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <Link href={editHref} className="inline-flex items-center gap-1.5 text-xs text-brand-ink/50 hover:text-brand-gold mb-4">
          <BackIcon size={13} /> {isRTL ? "تعديل البحث" : "Edit search"}
        </Link>

        <div className="mb-10">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-brand-midnight mb-2">
            {age
              ? (isRTL
                  ? `خيارات حفلة طفلك (${ageLabel(age, isRTL)}) في ${city}`
                  : `Party options for a ${ageLabel(age, isRTL)}-year-old in ${city}`)
              : (isRTL ? `خيارات حفلتك في ${city}` : `Party options in ${city}`)}
          </h1>
          <p className="text-sm text-brand-ink/55">
            {isRTL ? "ميزانية" : "Budget"}: {budgetLabel(budget ?? "mid", isRTL)}
          </p>
        </div>

        {wantsVenue && (
          <section className="mb-12">
            <h2 className="text-lg font-medium text-brand-midnight mb-4">
              {needLabel("venue", isRTL)}
            </h2>
            {venues.length === 0 ? (
              <div className="bg-white rounded-2xl border border-black/5 p-8 text-center text-sm text-brand-ink/50">
                {isRTL ? `لا توجد قاعات منشورة في ${city} بعد` : `No published venues in ${city} yet`}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {venues.map((v) => (
                  <VenueCard key={v.id} venue={v} locale={locale} t={t} />
                ))}
              </div>
            )}
          </section>
        )}

        {vendorResults.map(({ category, vendors }) => (
          <section key={category} className="mb-12">
            <h2 className="text-lg font-medium text-brand-midnight mb-4">
              {needLabel(PARTY_NEEDS.find((n) => n.vendorCategory === category)?.key ?? category, isRTL)}
            </h2>
            {vendors.length === 0 ? (
              <div className="bg-white rounded-2xl border border-black/5 p-8 text-center text-sm text-brand-ink/50">
                {isRTL ? `لا يوجد موردون في هذه الفئة في ${city} بعد` : `No vendors in this category in ${city} yet`}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {vendors.map((v) => (
                  <VendorCard key={v.id} vendor={v} locale={locale} t={t} />
                ))}
              </div>
            )}
          </section>
        ))}

        {!wantsVenue && vendorResults.length === 0 && (
          <div className="bg-white rounded-2xl border border-black/5 p-12 text-center">
            <p className="text-brand-ink/50 text-sm mb-3">
              {isRTL ? "لم تختر أي احتياجات للحفلة" : "You didn't select anything you need for the party"}
            </p>
            <Link href={editHref} className="text-sm text-brand-gold hover:underline font-medium">
              {isRTL ? "عدّل البحث ←" : "Edit your search →"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
