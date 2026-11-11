import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Plus, CalendarDays, MapPin, Users } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { styles, colors } from "@/lib/styles";
import type { Party, RsvpStatus } from "@/lib/types";

// Moved here from the old app/parties/index.tsx when the Organizer app's
// Events/Crowdfunding/Settings tabs were merged into this one app (the
// "Log out" affordance that used to live at the top of this screen now
// lives in the Settings tab instead, alongside the rest of the account).
interface PartyRow extends Party {
  party_guests: { id: string; rsvp_status: RsvpStatus }[];
}

export default function PartiesListScreen() {
  const { session } = useAuth();
  const [parties, setParties] = useState<PartyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from("parties")
      .select("*, party_guests(id, rsvp_status)")
      .eq("host_id", session.user.id)
      .order("starts_at", { ascending: true });
    setParties((data ?? []) as PartyRow[]);
    setLoading(false);
    setRefreshing(false);
  }, [session]);

  // Reload every time this screen regains focus (e.g. coming back from
  // creating a party or editing guests) rather than only on first mount.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    load();
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={parties}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        ListEmptyComponent={
          !loading ? (
            <View style={[styles.card, { alignItems: "center", paddingVertical: 40 }]}>
              <Text style={styles.subtle}>You haven&apos;t arranged a party yet</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const yes = item.party_guests.filter((g) => g.rsvp_status === "yes").length;
          const total = item.party_guests.length;
          return (
            <Pressable
              style={[styles.card, { marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}
              onPress={() => router.push({ pathname: "/parties/[id]", params: { id: item.id } })}
            >
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={{ fontWeight: "700", color: colors.ink, fontSize: 15 }}>{item.title}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 6 }}>
                  <CalendarDays size={12} color={colors.inkFaint} />
                  <Text style={styles.subtle}>{new Date(item.starts_at).toLocaleString()}</Text>
                </View>
                {item.location_name && (
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 6 }}>
                    <MapPin size={12} color={colors.inkFaint} />
                    <Text style={styles.subtle}>{item.location_name}</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F3F1EA", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Users size={12} color={colors.ink} />
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.ink }}>{yes}/{total}</Text>
              </View>
            </Pressable>
          );
        }}
      />

      <Pressable
        style={{
          position: "absolute",
          bottom: 28,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.gold,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: colors.gold,
          shadowOpacity: 0.4,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        }}
        onPress={() => router.push("/parties/new")}
      >
        <Plus size={24} color={colors.midnight} />
      </Pressable>
    </View>
  );
}
