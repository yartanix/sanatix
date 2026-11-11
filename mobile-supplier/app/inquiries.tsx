import { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, FlatList } from "react-native";
import { useFocusEffect } from "expo-router";
import { Send } from "lucide-react-native";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { styles, colors } from "@/lib/styles";
import type { VendorInquiry } from "@/lib/types";

export default function InquiriesScreen() {
  const { session } = useAuth();
  const [inquiries, setInquiries] = useState<VendorInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    const { data: vendors } = await supabase.from("vendors").select("id").eq("owner_id", session.user.id);
    const ids = (vendors ?? []).map((v) => v.id);
    if (ids.length === 0) {
      setInquiries([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("vendor_inquiries")
      .select("*")
      .in("vendor_id", ids)
      .order("created_at", { ascending: false });
    setInquiries((data ?? []) as VendorInquiry[]);
    setLoading(false);
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function respond(id: string) {
    const text = (drafts[id] ?? "").trim();
    if (!text) return;
    setSending(id);
    const { data } = await supabase
      .from("vendor_inquiries")
      .update({ vendor_response: text })
      .eq("id", id)
      .select()
      .single();
    if (data) {
      setInquiries((prev) => prev.map((i) => (i.id === id ? (data as VendorInquiry) : i)));
      setDrafts((d) => ({ ...d, [id]: "" }));
    }
    setSending(null);
  }

  if (loading) {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      data={inquiries}
      keyExtractor={(i) => i.id}
      contentContainerStyle={{ padding: 20, gap: 12 }}
      ListEmptyComponent={<Text style={[styles.subtle, { textAlign: "center", marginTop: 60 }]}>No inquiries yet</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={{ fontWeight: "700", color: colors.ink }}>{item.name}</Text>
            <View
              style={{
                paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
                backgroundColor: item.status === "new" ? `${colors.gold}22` : item.status === "responded" ? "#10B98114" : "#0000000D",
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: "700", color: item.status === "new" ? colors.gold : item.status === "responded" ? colors.success : colors.inkFaint }}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>
          {item.phone && <Text style={styles.subtle}>{item.phone}</Text>}
          <Text style={{ color: colors.ink, marginTop: 6, fontSize: 14 }}>{item.message}</Text>

          {item.vendor_response ? (
            <View style={{ marginTop: 8, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: `${colors.gold}55` }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.gold }}>Your response:</Text>
              <Text style={{ fontSize: 13, color: colors.inkFaint }}>{item.vendor_response}</Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              <TextInput
                style={[styles.input, { flex: 1, paddingVertical: 9 }]}
                placeholder="Write your response..."
                placeholderTextColor={colors.inkFaint}
                value={drafts[item.id] ?? ""}
                onChangeText={(v) => setDrafts((d) => ({ ...d, [item.id]: v }))}
              />
              <Pressable
                style={[styles.goldButton, { width: 44, height: 44, paddingVertical: 0 }]}
                onPress={() => respond(item.id)}
                disabled={sending === item.id || !(drafts[item.id] ?? "").trim()}
              >
                {sending === item.id ? <ActivityIndicator color={colors.midnight} /> : <Send size={16} color={colors.midnight} />}
              </Pressable>
            </View>
          )}
        </View>
      )}
    />
  );
}
