import { createClient } from "@/lib/supabase/server";
import { getLocale, getTranslations } from "next-intl/server";
import { PartyPopper, ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import Navbar from "@/components/layout/Navbar";
import OccasionStepForm from "@/components/party/OccasionStepForm";
import PartyPlannerForm from "@/components/party/PartyPlannerForm";
import VenueAndLocationStep from "@/components/party/VenueAndLocationStep";
import ReviewStep from "@/components/party/ReviewStep";
import VendorCard from "@/components/vendors/VendorCard";
import { PARTY_NEEDS, ageLabel, budgetLabel, needLabel } from "@/lib/party-planner";
import type { Venue, Vendor } from "@/types";

interface PageProps {
  searchParams: Promise<{
    title?: string;
    date?: string;
    time?: string;
    age?: string;
    city?: string;
    budget?: string;
    needs?: string;
    step?: string;
    venueId?: string;
    locName?: string;
    locAddr?: string;
    lat?: string;
    lng?: string;
  }>;
}

// The "Plan your party" journey, in four steps, each its own URL state
// (shareable/bookmarkable, back-button friendly) rather than client-only
// wizard state:
//   1. Occasion name + date   (no params yet)
//   2. Age / city / budget / needs   (title + date set, no city yet)
//   3. Venue or location, browsing matched venues/vendors   (city set, step != review)
//   4. Review + Complete   (step=review) — creates the real party via
//      the same POST /api/parties the standalone "New Party" form uses.
export default async function PlanAPartyPage({ searchParams }: PageProps) {
  const { title, date, time, age, city, budget, needs, step, venueId, locName, locAddr, lat, lng } = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations();
  const isRTL = locale === "ar";
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  // ─── Step 1: occasion name + date ───────────────────────────────
  if (!title || !date) {
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
              {isRTL ? "لنبدأ باسم المناسبة وتاريخها" : "Let's start with what you're celebrating, and when"}
            </p>
          </div>
          <OccasionStepForm isRTL={isRTL} />
        </div>
      </div>
    );
  }

  // ─── Step 2: age / city / budget / needs ───────────────────────
  if (!city) {
    return (
      <div className="min-h-screen bg-brand-warm-white">
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-[#8A5E12] bg-brand-gold/10 border border-brand-gold/30 rounded-full px-4 py-2 mb-5">
              <PartyPopper size={13} />
              {title}
            </span>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-brand-midnight mb-3">
              {isRTL ? "أخبرنا المزيد" : "Tell us a bit more"}
            </h1>
            <p className="text-brand-ink/55 text-sm">
              {isRTL
                ? "أجب عن بضعة أسئلة ونقترح عليك أفضل القاعات والموردين"
                : "Answer a few quick questions and we'll match you with the right venues and vendors"}
            </p>
          </div>
          <PartyPlannerForm isRTL={isRTL} title={title} date={date} time={time ?? "17:00"} />
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
    supabase.from("venues").select("*").eq("city", city).eq("is_published", true).limit(20),
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

  const preferencesParams = { title, date, time: time ?? "17:00" };
  const venueStepParams = { title, date, time: time ?? "17:00", age: age ?? "", city, budget: budget ?? "mid", needs: needs ?? "" };

  // ─── Step 4: review + complete ─────────────────────────────────
  if (step === "review") {
    let selectedVenue: Venue | null = null;
    if (venueId) {
      const { data } = await supabase.from("venues").select("*").eq("id", venueId).maybeSingle();
      selectedVenue = (data as Venue) ?? null;
    }

    const startsAt = new Date(`${date}T${time || "17:00"}:00`).toISOString();
    const dateLabel = new Date(startsAt).toLocaleString(isRTL ? "ar-SA" : "en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });

    const needLabels = selectedNeeds.map((k) => needLabel(k, isRTL));
    const venueName = selectedVenue ? (isRTL ? selectedVenue.name_ar : selectedVenue.name_en) : null;
    const customLocLabel = !selectedVenue && (locName || locAddr) ? [locName, locAddr].filter(Boolean).join(" · ") : null;

    const notesParts: string[] = [];
    if (age) notesParts.push(`${isRTL ? "العمر" : "Age"}: ${ageLabel(age, isRTL)}`);
    notesParts.push(`${isRTL ? "الميزانية" : "Budget"}: ${budgetLabel(budget ?? "mid", isRTL)}`);
    if (needLabels.length > 0) notesParts.push(`${isRTL ? "الاحتياجات" : "Needs"}: ${needLabels.join(", ")}`);

    return (
      <div className="min-h-screen bg-brand-warm-white">
        <Navbar />
        <div className="px-6 py-12">
          <ReviewStep
            isRTL={isRTL}
            summary={{
              title,
              dateLabel,
              cityLabel: city,
              ageLabel: age ? ageLabel(age, isRTL) : "—",
              budgetLabel: budgetLabel(budget ?? "mid", isRTL),
              needLabels,
              venueLabel: venueName ? `${venueName} (${selectedVenue?.city})` : null,
              locationLabel: customLocLabel,
            }}
            payload={{
              title,
              startsAt,
              locationName: venueName ?? locName ?? null,
              locationAddress: selectedVenue?.address ?? locAddr ?? null,
              lat: selectedVenue?.lat ?? (lat ? Number(lat) : null),
              lng: selectedVenue?.lng ?? (lng ? Number(lng) : null),
              notes: notesParts.join(" · "),
            }}
            editHrefs={{
              occasion: `/plan-a-party`,
              preferences: `/plan-a-party?${new URLSearchParams(preferencesParams).toString()}`,
              venue: `/plan-a-party?${new URLSearchParams(venueStepParams).toString()}`,
            }}
          />
        </div>
      </div>
    );
  }

  // ─── Step 3: venue / location, browsing matched vendors ─────────
  const editHref = `/plan-a-party?${new URLSearchParams(preferencesParams).toString()}`;

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

        <VenueAndLocationStep isRTL={isRTL} venues={venues} showVenues={wantsVenue} baseParams={venueStepParams} />

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

        {vendorResults.length === 0 && (
          <div className="bg-white rounded-2xl border border-black/5 p-8 text-center text-sm text-brand-ink/50 mb-12">
            {isRTL ? "لم تختر أي موردين — لا بأس، يمكنك المتابعة إلى المراجعة أعلاه" : "You didn't pick any vendor needs — that's fine, use \"Continue to review\" above whenever you're ready"}
          </div>
        )}
      </div>
    </div>
  );
}
