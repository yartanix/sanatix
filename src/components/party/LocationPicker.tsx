"use client";

import { useCallback, useRef, useState } from "react";
import { GoogleMap, Marker, Autocomplete, useJsApiLoader } from "@react-google-maps/api";
import { MapPin } from "lucide-react";

export interface CustomLocation {
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
}

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
const MAPS_LIBRARIES: "places"[] = ["places"];

// Lets a visitor supply their own location (a home, a majlis, anywhere
// not in the venues marketplace) instead of — or alongside skipping —
// picking a published venue. When a Maps key is configured this drops a
// draggable pin with address search; without one it degrades to plain
// text fields so the step still works, just without the live map.
export default function LocationPicker({
  isRTL,
  value,
  onChange,
}: {
  isRTL: boolean;
  value: CustomLocation;
  onChange: (next: CustomLocation) => void;
}) {
  if (MAPS_KEY) {
    return <InteractiveLocationPicker isRTL={isRTL} value={value} onChange={onChange} />;
  }
  return <ManualLocationFields isRTL={isRTL} value={value} onChange={onChange} />;
}

function ManualLocationFields({
  isRTL,
  value,
  onChange,
}: {
  isRTL: boolean;
  value: CustomLocation;
  onChange: (next: CustomLocation) => void;
}) {
  const inputClass =
    "w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-brand-midnight placeholder:text-brand-ink/35 focus:outline-none focus:border-brand-gold/50";
  const labelClass = "block text-xs font-semibold text-brand-ink/60 mb-1.5";

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>{isRTL ? "اسم المكان" : "Location name"}</label>
        <input
          type="text"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder={isRTL ? "مثال: منزلنا" : "e.g. Our house"}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>{isRTL ? "العنوان" : "Address"}</label>
        <input
          type="text"
          value={value.address}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          placeholder={isRTL ? "العنوان الكامل" : "Full address"}
          className={inputClass}
        />
      </div>
    </div>
  );
}

function InteractiveLocationPicker({
  isRTL,
  value,
  onChange,
}: {
  isRTL: boolean;
  value: CustomLocation;
  onChange: (next: CustomLocation) => void;
}) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: MAPS_KEY as string, libraries: MAPS_LIBRARIES });
  const [center, setCenter] = useState({ lat: value.lat ?? 24.7136, lng: value.lng ?? 46.6753 }); // Riyadh default
  const autocompleteRef = useRef<any>(null);

  const handlePlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace?.();
    const loc = place?.geometry?.location;
    if (!loc) return;
    const next = { lat: loc.lat(), lng: loc.lng() };
    setCenter(next);
    onChange({ name: value.name, address: place?.formatted_address ?? value.address, lat: next.lat, lng: next.lng });
  }, [onChange, value.address, value.name]);

  const handleMapClick = useCallback(
    (e: any) => {
      const latLng = e?.latLng;
      if (!latLng) return;
      const next = { lat: latLng.lat(), lng: latLng.lng() };
      setCenter(next);
      onChange({ ...value, lat: next.lat, lng: next.lng });
    },
    [onChange, value]
  );

  const inputClass =
    "w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-brand-midnight placeholder:text-brand-ink/35 focus:outline-none focus:border-brand-gold/50";
  const labelClass = "block text-xs font-semibold text-brand-ink/60 mb-1.5";

  if (!isLoaded) {
    return <div className="h-48 rounded-xl bg-brand-sand animate-pulse" />;
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>{isRTL ? "اسم المكان" : "Location name"}</label>
        <input
          type="text"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder={isRTL ? "مثال: منزلنا" : "e.g. Our house"}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>{isRTL ? "بحث عن عنوان" : "Search for an address"}</label>
        <Autocomplete onLoad={(a) => (autocompleteRef.current = a)} onPlaceChanged={handlePlaceChanged}>
          <input
            type="text"
            defaultValue={value.address}
            placeholder={isRTL ? "ابحث في خرانط جوجل..." : "Search Google Maps..."}
            className={inputClass}
          />
        </Autocomplete>
      </div>

      <div className="rounded-xl overflow-hidden border border-black/10">
        <GoogleMap
          center={center}
          zoom={13}
          onClick={handleMapClick}
          mapContainerStyle={{ width: "100%", height: "220px" }}
          options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
        >
          {value.lat != null && value.lng != null && <Marker position={{ lat: value.lat, lng: value.lng }} />}
        </GoogleMap>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-brand-ink/45">
        <MapPin size={12} />
        {isRTL ? "اضغط على الخريطة لتحديد الموقع الدقيق" : "Tap the map to drop the exact pin"}
      </p>
    </div>
  );
}
