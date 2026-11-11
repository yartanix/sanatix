import { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, FlatList } from "react-native";
import { useFocusEffect } from "expo-router";
import { Send, Star } from "lucide-react-native";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { styles, colors } from "@/lib/styles";
import type { Review } from "@/lib/types";

export default function ReviewsScreen() {
  const { session } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    const { data: vendors } = await supabase.from("vendors").select("id").eq("owner_id", session.user.id);
    const ids = (vendors ?? []).map((v) => v.id);
    if (ids.length === 0) {
      setReviews([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("reviews")
      .select("*, profiles(full_name)")
      .in("vendor_id", ids)
      .order("created_at", { ascending: false });
    setReviews((data ?? []) as unknown as Review[]);
    setLoading(false);
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function respond(id: string) {
    const text = (drafts[id] ?? "").trim();
    if (!text) return;
    setSending(id);
    const { data } = await supabase.from("reviews").update({ vendor_response: text }).eq("id", id).select().single();
    if (data) {
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, ...(data as Review) } : r)));
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
      data={reviews}
      keyExtractor={(r) => r.id}
      contentContainerStyle={{ padding: 20, gap: 12 }}
      ListEmptyComponent={<Text style={[styles.subtle, { textAlign: "center", marginTop: 60 }]}>No reviews yet</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontWeight: "700", color: colors.ink }}>{item.profiles?.full_name ?? "A user"}</Text>
            <View style={{ flexDirection: "row", gap: 2 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={12} color={i < item.rating ? colors.warning : colors.border} fill={i < item.rating ? colors.warning : "none"} />
              ))}
            </View>
          </View>
          {item.comment_en && <Text style={{ color: colors.ink, marginTop: 6, fontSize: 14 }}>{item.comment_en}</Text>}

          {item.vendor_response ? (
            <View style={{ marginTop: 8, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: `${colors.gold}55` }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.gold }}>Your response:</Text>
              <Text style={{ fontSize: 13, color: colors.inkFaint }}>{item.vendor_response}</Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              <TextInput
                style={[styles.input, { flex: 1, paddingVertical: 9 }]}
                placeholder="Respond to this review..."
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
