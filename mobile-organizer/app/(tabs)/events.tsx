import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Plus } from "lucide-react-native";
import { useAccessState } from "@/lib/access";
import { AccessGate } from "@/components/AccessGate";
import { supabase } from "@/lib/supabase";
import { styles, colors } from "@/lib/styles";
import type { SanatixEvent } from "@/lib/types";

const STATUS_COLOR: Record<string, string> = {
  published: colors.success,
  draft: colors.warning,
  cancelled: colors.danger,
  completed: colors.inkFaint,
};

export default function EventsList() {
  const { status, profile } = useAccessState(["organizer", "admin"]);
  const [events, setEvents] = useState<SanatixEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (status !== "ok" || !profile) return;
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("organizer_id", profile.id)
      .order("created_at", { ascending: false });
    setEvents((data ?? []) as SanatixEvent[]);
    setLoading(false);
  }, [status, profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (status !== "ok") {
    return <AccessGate status={status} roleLabel="organizer" feature="your events" />;
  }

  if (loading) {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: 20, gap: 10 }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Text style={styles.subtle}>No events yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/events/${item.id}`)}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ fontWeight: "700", color: colors.ink, flex: 1 }} numberOfLines={1}>
                {item.title_en}
              </Text>
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: `${STATUS_COLOR[item.status]}1A` }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: STATUS_COLOR[item.status] }}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.subtle}>{item.venue_city}</Text>
          </Pressable>
        )}
      />
      <Pressable
        style={{ position: "absolute", bottom: 24, right: 24, width: 54, height: 54, borderRadius: 27, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center" }}
        onPress={() => router.push("/events/new")}
      >
        <Plus size={24} color={colors.midnight} />
      </Pressable>
    </View>
  );
}
