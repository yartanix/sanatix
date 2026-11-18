"use client";

import { useState, useTransition } from "react";
import { MessageCircle, MessagesSquare, Loader2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/routing";
import type { DirectoryProfile } from "@/types";

function initials(name: string | null) {
  if (!name) return "?";
  return name.trim().slice(0, 2).toUpperCase();
}

interface Props {
  partyId: string;
  myId: string;
  members: DirectoryProfile[];
  isRTL: boolean;
}

/**
 * Host-side counterpart to EventAttendees: lists the guests already
 * linked to a Sanatix account (get_party_members() only returns rows
 * for host + guests that have a user_id, i.e. RSVP'd signed-in or were
 * added straight from the directory) and lets the host jump into the
 * party's group chat or DM a specific guest.
 */
export default function PartyMembers({ partyId, myId, members, isRTL }: Props) {
  const [joining, setJoining] = useState(false);
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const others = members.filter((p) => p.id !== myId);

  async function openPartyChat() {
    setJoining(true);
    setError(null);
    const supabase = createClient();
    const { data, error: joinError } = await supabase.rpc("join_party_group", { p_party_id: partyId });
    setJoining(false);
    if (joinError) {
      setError(isRTL ? "تعذّر فتح محادثة الحفلة." : "Couldn't open the party chat.");
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
    <div className="bg-white rounded-3xl border border-black/5 p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-brand-midnight flex items-center gap-2">
          <Users size={15} className="text-brand-gold" />
          {isRTL ? "ضيوف على سناتيكس" : "Guests on Sanatix"}
        </h3>
        <button
          type="button"
          onClick={openPartyChat}
          disabled={joining || isPending}
          className="flex items-center gap-1.5 text-xs font-semibold text-brand-midnight rounded-full px-3 py-1.5 bg-gradient-to-br from-brand-gold-light to-brand-gold hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
        >
          {joining ? <Loader2 size={12} className="animate-spin" /> : <MessagesSquare size={12} />}
          {isRTL ? "محادثة الحفلة" : "Party chat"}
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {others.length === 0 ? (
        <p className="text-xs text-brand-ink/40">
          {isRTL
            ? "لا يوجد ضيوف مرتبطون بحساب سناتيكس بعد"
            : "No guests linked to a Sanatix account yet"}
        </p>
      ) : (
        <div className="space-y-2">
          {others.map((profile) => (
            <div key={profile.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="shrink-0 w-8 h-8 rounded-full bg-brand-midnight/5 flex items-center justify-center text-[11px] font-bold text-brand-midnight overflow-hidden">
                  {profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    initials(profile.full_name)
                  )}
                </div>
                <p className="text-sm text-brand-midnight truncate">
                  {profile.full_name ?? (isRTL ? "مستخدم سناتيكس" : "Sanatix user")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleMessage(profile)}
                disabled={messagingId === profile.id || isPending}
                className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-brand-midnight rounded-full px-2.5 py-1 border border-black/10 hover:border-brand-gold/40 transition-colors disabled:opacity-50"
              >
                {messagingId === profile.id ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <MessageCircle size={11} />
                )}
                {isRTL ? "مراسلة" : "Message"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
