"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, MessageCircle, Loader2 } from "lucide-react";
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
  initialProfiles: DirectoryProfile[];
  isRTL: boolean;
  /**
   * When set, the browser is being used as a picker (e.g. organizer
   * invite flow / host adding a guest) rather than a messaging directory:
   * the "Message" action is replaced with onPick, and there's no DM gate
   * to worry about since the caller decides what picking someone does.
   */
  onPick?: (profile: DirectoryProfile) => void;
  excludeIds?: string[];
}

export default function DirectoryBrowser({ initialProfiles, isRTL, onPick, excludeIds }: Props) {
  const [query, setQuery] = useState("");
  const [profiles, setProfiles] = useState(initialProfiles);
  const [searching, setSearching] = useState(false);
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const visible = useMemo(() => {
    if (!excludeIds?.length) return profiles;
    const exclude = new Set(excludeIds);
    return profiles.filter((p) => !exclude.has(p.id));
  }, [profiles, excludeIds]);

  async function runSearch(q: string) {
    setQuery(q);
    setError(null);
    setSearching(true);
    const supabase = createClient();
    const { data, error: searchError } = await supabase.rpc("search_directory", {
      q: q.trim() === "" ? null : q.trim(),
      limit_n: 50,
    });
    setSearching(false);
    if (searchError) return;
    setProfiles((data ?? []) as DirectoryProfile[]);
  }

  async function handleMessage(profile: DirectoryProfile) {
    setError(null);
    setMessagingId(profile.id);
    const supabase = createClient();
    const { data, error: dmError } = await supabase.rpc("start_or_get_dm", {
      p_other_user_id: profile.id,
    });
    setMessagingId(null);

    if (dmError) {
      if (dmError.message?.includes("NO_SHARED_EVENT")) {
        setError(
          isRTL
            ? `لا يمكنك مراسلة ${profile.full_name ?? "هذا المستخدم"} إلا إذا شاركتما فعالية أو حفلة.`
            : `You can only message ${profile.full_name ?? "this user"} if you share an event or party.`
        );
      } else if (dmError.message?.toLowerCase().includes("cannot message")) {
        setError(isRTL ? "تعذّر إرسال رسالة لهذا المستخدم." : "You can't message this user.");
      } else {
        setError(isRTL ? "حدث خطأ غير متوقع." : "Something went wrong.");
      }
      return;
    }

    startTransition(() => {
      router.push(`/community/chat/${data as string}`);
    });
  }

  return (
    <div>
      <div className="relative mb-5">
        <Search
          size={16}
          className={`absolute top-1/2 -translate-y-1/2 text-brand-ink/35 ${isRTL ? "right-4" : "left-4"}`}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => runSearch(e.target.value)}
          placeholder={isRTL ? "ابحث بالاسم..." : "Search by name..."}
          className={`w-full rounded-full border border-black/10 bg-white py-3 text-sm text-brand-midnight placeholder:text-brand-ink/35 focus:outline-none focus:border-brand-gold/50 ${
            isRTL ? "pr-11 pl-4" : "pl-11 pr-4"
          }`}
        />
        {searching && (
          <Loader2
            size={14}
            className={`absolute top-1/2 -translate-y-1/2 animate-spin text-brand-ink/35 ${isRTL ? "left-4" : "right-4"}`}
          />
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="bg-white rounded-3xl border border-black/5 p-10 text-center text-sm text-brand-ink/50">
          {isRTL ? "لا توجد نتائج" : "No one found"}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((profile) => {
            const roleLabel = (isRTL ? ROLE_LABEL_AR : ROLE_LABEL_EN)[profile.role] ?? profile.role;
            return (
              <div
                key={profile.id}
                className="flex items-center justify-between gap-3 bg-white rounded-2xl border border-black/5 p-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-brand-midnight/5 flex items-center justify-center text-xs font-bold text-brand-midnight overflow-hidden">
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
                    <p className="text-xs text-brand-ink/50 truncate">
                      {roleLabel}
                      {profile.city ? ` · ${profile.city}` : ""}
                    </p>
                  </div>
                </div>

                {onPick ? (
                  <button
                    type="button"
                    onClick={() => onPick(profile)}
                    className="shrink-0 text-xs font-semibold text-brand-midnight rounded-full px-3.5 py-2 bg-gradient-to-br from-brand-gold-light to-brand-gold hover:opacity-90 transition-opacity"
                  >
                    {isRTL ? "إضافة" : "Add"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleMessage(profile)}
                    disabled={messagingId === profile.id || isPending}
                    className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-brand-midnight rounded-full px-3.5 py-2 border border-black/10 hover:border-brand-gold/40 transition-colors disabled:opacity-50"
                  >
                    {messagingId === profile.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <MessageCircle size={13} />
                    )}
                    {isRTL ? "مراسلة" : "Message"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
