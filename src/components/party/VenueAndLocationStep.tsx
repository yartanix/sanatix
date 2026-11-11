"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { MapPin, Users, Check } from "lucide-react";
import LocationPicker, { type CustomLocation } from "./LocationPicker";
import type { Venue } from "@/types";

const EMPTY_LOCATION: CustomLocation = { name: "", address: "", lat: null, lng: null };

// Step 3 of the journey. Picking a published venue is entirely
// optional — a visitor can instead describe their own location (home,
// majlis, anywhere) via LocationPicker, or skip both and move on with
// no location at all. Whatever they pick travels forward as query
// params into the review step.
export default function VenueAndLocationStep({
  isRTL,
  venues,
  showVenues,
  baseParams,
}: {
  isRTL: boolean;
  venues: Venue[];
  showVenues: boolean;
  // Every param collected so far (title, date, time, age, city, budget,
  // needs) — carried through untouched into the review step.
  baseParams: Record<string, string>;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"none" | "venue" | "custom">(showVenues && venues.length > 0 ? "venue" : "none");
  const [venueId, setVenueId] = useState<string | null>(null);
  const [customLocation, setCustomLocation] = useState<CustomLocation>(EMPTY_LOCATION);

  const selectedVenue = useMemo(() => venues.find((v) => v.id === venueId) ?? null, [venues, venueId]);

  function continueToReview() {
    const params = new URLSearchParams(baseParams);
    params.set("step", "review");
    if (mode === "venue" && selectedVenue) {
      params.set("venueId", selectedVenue.id);
    } else if (mode === "custom") {
      if (customLocation.name) params.set("locName", customLocation.name);
      if (customLocation.address) params.set("locAddr", customLocation.address);
      if (customLocation.lat != null) params.set("lat", String(customLocation.lat));
      if (customLocation.lng != null) params.set("lng", String(customLocation.lng));
    }
    router.push(`/plan-a-party?${params.toString()}`);
  }

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-brand-midnight">
          {isRTL ? "القاعة أو الموقع" : "Venue or location"}
        </h2>
        <span className="text-xs text-brand-ink/40">{isRTL ? "اختياري" : "Optional"}</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {showVenues && venues.length > 0 && (
          <button
            type="button"
            onClick={() => setMode("venue")}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              mode === "venue" ? "bg-brand-midnight text-white border-brand-midnight" : "bg-white text-brand-ink/65 border-black/10 hover:border-brand-gold/50"
            }`}
          >
            {isRTL ? "اختر من القاعات المقترحة" : "Choose a suggested venue"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setMode("custom")}
          className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5 ${
            mode === "custom" ? "bg-brand-midnight text-white border-brand-midnight" : "bg-white text-brand-ink/65 border-black/10 hover:border-brand-gold/50"
          }`}
        >
          <MapPin size={13} />
          {isRTL ? "استخدم موقعي الخاص" : "Use my own location"}
        </button>
        <button
          type="button"
          onClick={() => setMode("none")}
          className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
            mode === "none" ? "bg-brand-midnight text-white border-brand-midnight" : "bg-white text-brand-ink/65 border-black/10 hover:border-brand-gold/50"
          }`}
        >
          {isRTL ? "تخطَّ هذه الخطوة" : "Skip for now"}
        </button>
      </div>

      {mode === "venue" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {venues.map((v) => {
            const name = isRTL ? v.name_ar : v.name_en;
            const selected = venueId === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setVenueId(selected ? null : v.id)}
                className={`text-start bg-white rounded-2xl border overflow-hidden transition-all h-full ${
                  selected ? "border-brand-gold ring-2 ring-brand-gold/30" : "border-black/5 hover:border-brand-gold/40"
                }`}
              >
                <div className="h-32 bg-brand-sand relative overflow-hidden">
                  {v.cover_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.cover_image} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-12 h-12 rounded-xl bg-brand-gold/10 flex items-center justify-center text-brand-gold text-lg font-medium">
                        {name?.charAt(0) ?? "V"}
                      </div>
                    </div>
                  )}
                  {selected && (
                    <span className="absolute top-2 end-2 w-6 h-6 rounded-full bg-brand-gold flex items-center justify-center">
                      <Check size={14} className="text-brand-midnight" />
                    </span>
                  )}
                </div>
                <div className="p-3.5 space-y-1.5">
                  <h3 className="font-medium text-brand-midnight text-sm leading-snug line-clamp-1">{name}</h3>
                  <div className="flex items-center justify-between text-xs text-brand-ink/50">
                    <span className="flex items-center gap-1">
                      <MapPin size={11} /> {v.city}
                    </span>
                    {v.capacity_max && (
                      <span className="flex items-center gap-1">
                        <Users size={11} /> {isRTL ? "حتى" : "Up to"} {v.capacity_max}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {mode === "custom" && (
        <div className="bg-white rounded-2xl border border-black/5 p-5">
          <LocationPicker isRTL={isRTL} value={customLocation} onChange={setCustomLocation} />
        </div>
      )}

      {mode === "none" && (
        <div className="bg-white rounded-2xl border border-black/5 p-6 text-center text-sm text-brand-ink/50">
          {isRTL ? "لا بأس، يمكنك إضافة الموقع لاحقاً" : "No problem — you can always add a location later"}
        </div>
      )}

      <button
        onClick={continueToReview}
        className="mt-6 w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-br from-brand-gold-light to-brand-gold text-brand-midnight font-semibold py-3 px-8 rounded-xl text-sm hover:opacity-90 transition-opacity"
      >
        {isRTL ? "متابعة إلى المراجعة" : "Continue to review"}
      </button>
    </section>
  );
}
