import { useCallback, useState } from "react";
import { View, Text, ActivityIndicator, ScrollView } from "react-native";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { styles, colors } from "@/lib/styles";
import type { CrowdfundingCampaign } from "@/lib/types";

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [campaign, setCampaign] = useState<CrowdfundingCampaign | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("campaigns").select("*").eq("id", id).single();
    setCampaign(data as CrowdfundingCampaign | null);
    setLoading(false);
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !campaign) {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const pct = campaign.goal_amount > 0 ? Math.min(100, Math.round((campaign.raised_amount / campaign.goal_amount) * 100)) : 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.h1}>{campaign.title_en}</Text>
      <Text style={[styles.subtle, { marginBottom: 20 }]}>{campaign.title_ar}</Text>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.ink }}>{campaign.raised_amount}</Text>
          <Text style={styles.subtle}>Raised ({campaign.currency})</Text>
        </View>
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.ink }}>{campaign.backer_count}</Text>
          <Text style={styles.subtle}>Backers</Text>
        </View>
      </View>

      <View style={{ height: 8, borderRadius: 999, backgroundColor: colors.border, overflow: "hidden", marginBottom: 8 }}>
        <View style={{ height: "100%", width: `${pct}%`, backgroundColor: colors.gold }} />
      </View>
      <Text style={styles.subtle}>Goal: {campaign.goal_amount} {campaign.currency} · {campaign.status}</Text>
    </ScrollView>
  );
}
