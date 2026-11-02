import { Link } from "@/i18n/routing";
import { MapPin, CalendarDays } from "lucide-react";
import type { Profile } from "@/types";

interface OrganizerCardProps {
  organizer: Profile;
  eventCount: number;
  t: (key: string) => string;
}

export default function OrganizerCard({ organizer, eventCount, t }: OrganizerCardProps) {
  const name = organizer.full_name ?? t("organizers.unnamed");

  return (
    <Link href={`/organizers/${organizer.id}`} className="group block">
      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all h-full p-5 text-center">
        {organizer.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={organizer.avatar_url} alt={name} className="w-16 h-16 rounded-2xl object-cover mx-auto" />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-brand-gold/10 flex items-center justify-center text-brand-gold text-xl font-medium mx-auto">
            {name.charAt(0)}
          </div>
        )}
        <p className="font-medium text-brand-midnight text-sm mt-3 truncate group-hover:text-brand-gold transition-colors">{name}</p>
        <div className="flex items-center justify-center gap-3 text-xs text-brand-ink/45 mt-1.5">
          {organizer.city && (
            <span className="flex items-center gap-1">
              <MapPin size={11} /> {organizer.city}
            </span>
          )}
          <span className="flex items-center gap-1">
            <CalendarDays size={11} /> {eventCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
