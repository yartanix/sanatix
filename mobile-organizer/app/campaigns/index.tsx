import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Plus } from "lucide-react-native";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { styles, colors } from "@/lib/styles";
import type { CrowdfundingCampaign } from "@/lib/types";

export default function CampaignsList() {
  const { session } = useAuth();
  const [campaigns, setCampaigns] = useState<CrowdfundingCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .eq("organizer_id", session.user.id)
      .order("created_at", { ascending: false });
    setCampaigns((data ?? []) as CrowdfundingCampaign[]);
    setLoading(false);
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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
        data={campaigns}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 20, gap: 10 }}
        ListEmptyComponent={<Text style={[styles.subtle, { textAlign: "center", marginTop: 60 }]}>No campaigns yet</Text>}
        renderItem={({ item }) => {
          const pct = item.goal_amount > 0 ? Math.min(100, Math.round((item.raised_amount / item.goal_amount) * 100)) : 0;
          return (
            <Pressable style={styles.card} onPress={() => router.push(`/campaigns/${item.id}`)}>
              <Text style={{ fontWeight: "700", color: colors.ink, marginBottom: 6 }}>{item.title_en}</Text>
              <View style={{ height: 6, borderRadius: 999, backgroundColor: colors.border, overflow: "hidden", marginBottom: 6 }}>
                <View style={{ height: "100%", width: `${pct}%`, backgroundColor: colors.gold }} />
              </View>
              <Text style={styles.subtle}>{item.raised_amount} / {item.goal_amount} {item.currency} · {item.backer_count} backers</Text>
            </Pressable>
          );
        }}
      />
      <Pressable
        style={{ position: "absolute", bottom: 24, right: 24, width: 54, height: 54, borderRadius: 27, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center" }}
        onPress={() => router.push("/campaigns/new")}
      >
        <Plus size={24} color={colors.midnight} />
      </Pressable>
    </View>
  );
}
