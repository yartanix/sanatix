import { useCallback, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator, Image } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Search, MessageCircle, Users } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { styles, colors } from "@/lib/styles";
import type { DirectoryProfile } from "@/lib/types";

const ROLE_LABEL: Record<string, string> = {
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

// Mirrors the web app's community/page.tsx + DirectoryBrowser.tsx: every
// Sanatix account is visible here, but DM is gated server-side by
// start_or_get_dm() (a shared event/party is required) -- this screen
// doesn't need to pre-filter, it just surfaces whatever error that RPC
// returns.
export default function CommunityScreen() {
  const [query, setQuery] = useState("");
  const [profiles, setProfiles] = useState<DirectoryProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    const { data } = await supabase.rpc("search_directory", { q: q.trim() || null, limit_n: 50 });
    setProfiles((data ?? []) as DirectoryProfile[]);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      search(query);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  async function handleMessage(profile: DirectoryProfile) {
    setError(null);
    setMessagingId(profile.id);
    const { data, error: dmError } = await supabase.rpc("start_or_get_dm", { p_other_user_id: profile.id });
    setMessagingId(null);
    if (dmError) {
      setError(
        dmError.message?.includes("NO_SHARED_EVENT")
          ? `You can only message ${profile.full_name ?? "this user"} if you share an event or party.`
          : "Couldn't start a conversation."
      );
      return;
    }
    router.push({ pathname: "/community/chat/[id]", params: { id: data as string } });
  }

  return (
    <View style={styles.screen}>
      <View style={{ padding: 20, paddingBottom: 10, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Users size={16} color={colors.gold} />
          <Text style={styles.h1}>Community</Text>
        </View>
        <Text style={styles.subtle}>Browse every Sanatix account. You can only message someone you share an event or party with.</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Search size={15} color={colors.inkFaint} style={{ position: "absolute", left: 14, zIndex: 1 }} />
          <TextInput
            style={[styles.input, { flex: 1, paddingLeft: 38 }]}
            placeholder="Search by name..."
            placeholderTextColor={colors.inkFaint}
            value={query}
            onChangeText={(v) => {
              setQuery(v);
              search(v);
            }}
          />
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.gold} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 8, paddingBottom: 100 }}
          ListEmptyComponent={<Text style={[styles.subtle, { textAlign: "center", marginTop: 30 }]}>No one found</Text>}
          renderItem={({ item }) => (
            <View style={[styles.card, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "#F3F1EA",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {item.avatar_url ? (
                    <Image source={{ uri: item.avatar_url }} style={{ width: 36, height: 36 }} />
                  ) : (
                    <Text style={{ fontSize: 12, fontWeight: "700", color: colors.ink }}>{initials(item.full_name)}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700", color: colors.ink, fontSize: 14 }} numberOfLines={1}>
                    {item.full_name ?? "Sanatix user"}
                  </Text>
                  <Text style={styles.subtle}>{ROLE_LABEL[item.role] ?? item.role}{item.city ? ` · ${item.city}` : ""}</Text>
                </View>
              </View>
              <Pressable
                style={[styles.outlineButton, { flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingVertical: 8 }]}
                onPress={() => handleMessage(item)}
                disabled={messagingId === item.id}
              >
                {messagingId === item.id ? (
                  <ActivityIndicator size="small" color={colors.ink} />
                ) : (
                  <MessageCircle size={13} color={colors.ink} />
                )}
                <Text style={[styles.outlineButtonText, { fontSize: 12 }]}>Message</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}
