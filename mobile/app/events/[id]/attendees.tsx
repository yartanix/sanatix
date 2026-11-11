import { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, FlatList } from "react-native";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import { Check, X, DoorOpen } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { styles, colors } from "@/lib/styles";
import type { Attendee } from "@/lib/types";

export default function AttendeesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("bookings")
      .select("id, quantity, total_amount, currency, status, qr_code, checked_in_at, created_at, profiles(full_name, phone), ticket_types(name_ar, name_en)")
      .eq("event_id", id)
      .order("created_at", { ascending: false });
    setAttendees((data ?? []) as unknown as Attendee[]);
    setLoading(false);
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function checkIn() {
    const ref = code.trim();
    if (!ref || checking) return;
    setChecking(true);
    setResult(null);
    const { data, error } = await supabase.rpc("check_in_booking", { p_event_id: id, p_code: ref });
    setChecking(false);
    setCode("");
    if (error) {
      setResult({ ok: false, message: "No matching confirmed booking" });
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    setResult({
      ok: true,
      message: row?.already_checked_in ? `${row.guest_name} — already checked in` : `${row?.guest_name} — checked in ✓`,
    });
    load();
  }

  return (
    <View style={styles.screen}>
      <View style={{ padding: 20, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <DoorOpen size={15} color={colors.gold} />
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.ink }}>Check in an attendee</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Ticket code"
            placeholderTextColor={colors.inkFaint}
            autoCapitalize="characters"
            value={code}
            onChangeText={setCode}
          />
          <Pressable style={[styles.goldButton, { paddingHorizontal: 18 }]} onPress={checkIn} disabled={checking}>
            {checking ? <ActivityIndicator color={colors.midnight} /> : <Text style={styles.goldButtonText}>Go</Text>}
          </Pressable>
        </View>
        {result && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: result.ok ? "#10B98114" : "#E11D4814", borderRadius: 10, padding: 10 }}>
            {result.ok ? <Check size={14} color={colors.success} /> : <X size={14} color={colors.danger} />}
            <Text style={{ fontSize: 13, color: result.ok ? colors.success : colors.danger, fontWeight: "600" }}>{result.message}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.gold} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={attendees}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 8 }}
          ListEmptyComponent={<Text style={[styles.subtle, { textAlign: "center", marginTop: 30 }]}>No bookings yet</Text>}
          renderItem={({ item }) => (
            <View style={[styles.card, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
              <View>
                <Text style={{ fontWeight: "600", color: colors.ink }}>{item.profiles?.full_name ?? "—"}</Text>
                <Text style={styles.subtle}>{item.ticket_types?.name_en ?? "—"} · x{item.quantity}</Text>
              </View>
              {item.checked_in_at ? (
                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: "#10B98114" }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.success }}>Checked in</Text>
                </View>
              ) : (
                <Text style={{ fontSize: 11, color: colors.inkFaint }}>—</Text>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}
