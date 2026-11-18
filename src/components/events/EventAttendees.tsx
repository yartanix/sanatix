"use client";

import { useState, useTransition } from "react";
import { MessageCircle, MessagesSquare, Loader2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/routing";
import type { DirectoryProfile } from "@/types";

const ROLE_LABEL_AR: Record<string, string> = {
  customer: "زائر",
  supplier: "مورّد",
  organizer: "منظّم",
  admin: "إدارة",
  influencer: "مؤثر",
};
const ROLE_LABEL_EN: Record<string, string> = {
  customer: "Attendee",
  supplier: "Vendor",
  organizer: "Organizer",
  admin: "Admin",
  influencer: "Influencer",
};

function initials(name: string | null) {
  if (!name) return "?";
  return name.trim().slice(0, 2).toUpperCase();
}

interface Props {
  eventId: string;
  myId: string;
  attendees: DirectoryProfile[];
  isRTL: boolean;
}

/**
 * Shown on the public event page to anyone who already qualifies as a
 * participant (organizer, a live booking, or an invite -- the server
 * component only passes attendees down when get_event_attendees()
 * succeeded for the signed-in viewer). Lets them see who else is going
 * and jump into either the event's group chat or a 1:1 DM with someone
 * specific, both gated the same way server-side via join_event_group()
 * and start_or_get_dm().
 */
export default function EventAttendees({ eventId, myId, attendees, isRTL }: Props) {
  const [joining, setJoining] = useState(false);
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const others = attendees.filter((p) => p.id !== myId);

  async function openEventChat() {
    setJoining(true);
    setError(null);
    const supabase = createClient();
    const { data, error: joinError } = await supabase.rpc("join_event_group", { p_event_id: eventId });
    setJoining(false);
    if (joinError) {
      setError(isRTL ? "تعذّر فتح محادثة الفعالية." : "Couldn't open the event chat.");
      return;
    }
    startTransition(() => {
      router.push(`/community/chat/${data as string}`);
    });
  }

  async function handleMessage(profile: DirectoryProfile) {
    setError(null);
    setMessagingId(profile.id);
    const supabase = createClient();
    const { data, error: dmError } = await supabase.rpc("start_or_get_dm", { p_other_user_id: profile.id });
    setMessagingId(null);
    if (dmError) {
      setError(isRTL ? "تعذّر بدء محادثة." : "Couldn't start a conversation.");
      return;
    }
    startTransition(() => {
      router.push(`/community/chat/${data as string}`);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-medium text-brand-midnight flex items-center gap-2">
          <Users size={17} className="text-brand-gold" />
          {isRTL ? "الحضور" : "Attendees"}
          <span className="text-sm font-normal text-brand-ink/40">({attendees.length})</span>
        </h2>
        <button
          type="button"
          onClick={openEventChat}
          disabled={joining || isPending}
          className="flex items-center gap-1.5 text-xs font-semibold text-brand-midnight rounded-full px-3.5 py-2 bg-gradient-to-br from-brand-gold-light to-brand-gold hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
        >
          {joining ? <Loader2 size={13} className="animate-spin" /> : <MessagesSquare size={13} />}
          {isRTL ? "محادثة الفعالية" : "Event chat"}
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {others.length === 0 ? (
        <p className="text-sm text-brand-ink/40">
          {isRTL ? "أنت أول من انضم حتى الآن" : "You're the first one here so far"}
        </p>
      ) : (
        <div className="space-y-2">
          {others.map((profile) => {
            const roleLabel = (isRTL ? ROLE_LABEL_AR : ROLE_LABEL_EN)[profile.role] ?? profile.role;
            return (
              <div
                key={profile.id}
                className="flex items-center justify-between gap-3 bg-white rounded-2xl border border-black/5 p-3.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0 w-9 h-9 rounded-full bg-brand-midnight/5 flex items-center justify-center text-xs font-bold text-brand-midnight overflow-hidden">
                    {profile.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      initials(profile.full_name)
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-midnight truncate">
                      {profile.full_name ?? (isRTL ? "مستخدم سناتيكس" : "Sanatix user")}
                    </p>
                    <p className="text-xs text-brand-ink/50 truncate">{roleLabel}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleMessage(profile)}
                  disabled={messagingId === profile.id || isPending}
                  className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-brand-midnight rounded-full px-3 py-1.5 border border-black/10 hover:border-brand-gold/40 transition-colors disabled:opacity-50"
                >
                  {messagingId === profile.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <MessageCircle size={12} />
                  )}
                  {isRTL ? "مراسلة" : "Message"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
