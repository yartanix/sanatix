import { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Users, Ticket as TicketIcon, Plus } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { styles, colors } from "@/lib/styles";
import type { SanatixEvent, TicketType } from "@/lib/types";

const label = { fontSize: 13, fontWeight: "600" as const, color: colors.ink, marginTop: 16, marginBottom: 6 };
const STATUSES: SanatixEvent["status"][] = ["draft", "published", "cancelled", "completed"];

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<SanatixEvent | null>(null);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [venueCity, setVenueCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [{ data: ev }, { data: tt }] = await Promise.all([
      supabase.from("events").select("*").eq("id", id).single(),
      supabase.from("ticket_types").select("*").eq("event_id", id).order("price", { ascending: true }),
    ]);
    if (ev) {
      setEvent(ev as SanatixEvent);
      setTitleAr(ev.title_ar);
      setTitleEn(ev.title_en);
      setVenueCity(ev.venue_city);
    }
    setTickets((tt ?? []) as TicketType[]);
    setLoading(false);
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function save() {
    if (!event) return;
    setSaving(true);
    await supabase.from("events").update({ title_ar: titleAr, title_en: titleEn, venue_city: venueCity }).eq("id", event.id);
    setSaving(false);
  }

  async function setStatus(status: SanatixEvent["status"]) {
    if (!event) return;
    await supabase.from("events").update({ status }).eq("id", event.id);
    setEvent({ ...event, status });
  }

  async function addTicketType() {
    if (!event) return;
    const { data } = await supabase
      .from("ticket_types")
      .insert({ event_id: event.id, name_ar: "عام", name_en: "General", price: 0, currency: "SAR", total_quantity: 50, status: "available" })
      .select()
      .single();
    if (data) setTickets((t) => [...t, data as TicketType]);
  }

  if (loading || !event) {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        {STATUSES.map((s) => (
          <Pressable
            key={s}
            onPress={() => setStatus(s)}
            style={{
              paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
              backgroundColor: event.status === s ? colors.gold : "#fff",
              borderWidth: 1, borderColor: event.status === s ? colors.gold : colors.border,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "700", color: event.status === s ? colors.midnight : colors.inkFaint, textTransform: "capitalize" }}>{s}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={label}>Title (English)</Text>
      <TextInput style={styles.input} value={titleEn} onChangeText={setTitleEn} />
      <Text style={label}>Title (Arabic)</Text>
      <TextInput style={styles.input} value={titleAr} onChangeText={setTitleAr} />
      <Text style={label}>City</Text>
      <TextInput style={styles.input} value={venueCity} onChangeText={setVenueCity} />

      <Pressable style={[styles.goldButton, { marginTop: 16 }]} onPress={save}>
        {saving ? <ActivityIndicator color={colors.midnight} /> : <Text style={styles.goldButtonText}>Save changes</Text>}
      </Pressable>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 28, marginBottom: 10 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink }}>Ticket types</Text>
        <Pressable onPress={addTicketType} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Plus size={14} color={colors.gold} />
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.gold }}>Add</Text>
        </Pressable>
      </View>
      {tickets.length === 0 ? (
        <Text style={styles.subtle}>No ticket types yet</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {tickets.map((t) => (
            <View key={t.id} style={[styles.card, { flexDirection: "row", alignItems: "center", gap: 10 }]}>
              <TicketIcon size={16} color={colors.gold} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "600", color: colors.ink }}>{t.name_en}</Text>
                <Text style={styles.subtle}>{t.price === 0 ? "Free" : `${t.price} ${t.currency}`} · {t.sold_quantity}/{t.total_quantity} sold</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <Pressable
        style={[styles.outlineButton, { marginTop: 24, flexDirection: "row", gap: 8 }]}
        onPress={() => router.push(`/events/${event.id}/attendees`)}
      >
        <Users size={16} color={colors.ink} />
        <Text style={styles.outlineButtonText}>View attendees & check in</Text>
      </Pressable>
    </ScrollView>
  );
}
