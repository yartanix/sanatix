import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { styles, colors } from "@/lib/styles";

const label = { fontSize: 13, fontWeight: "600" as const, color: colors.ink, marginTop: 16, marginBottom: 6 };

export default function NewEventScreen() {
  const { session } = useAuth();
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [venueCity, setVenueCity] = useState("");
  const [venueName, setVenueName] = useState("");
  const [startsAt, setStartsAt] = useState<Date>(() => {
    const d = new Date();
    d.setHours(18, 0, 0, 0);
    d.setDate(d.getDate() + 7);
    return d;
  });
  const [showPicker, setShowPicker] = useState<"date" | "time" | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canSubmit = titleAr.trim() && titleEn.trim() && venueCity.trim() && !saving && !!session;

  async function handleSubmit() {
    if (!canSubmit || !session) return;
    setSaving(true);
    setErrorMsg(null);
    const endsAt = new Date(startsAt.getTime() + 3 * 60 * 60 * 1000);
    const { data, error } = await supabase
      .from("events")
      .insert({
        organizer_id: session.user.id,
        title_ar: titleAr.trim(),
        title_en: titleEn.trim(),
        venue_name: venueName.trim() || null,
        venue_city: venueCity.trim(),
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status: "draft",
        is_free: true,
        category: "community",
        tags: [],
      })
      .select()
      .single();

    setSaving(false);
    if (error || !data) {
      setErrorMsg(error?.message ?? "Couldn't create the event — try again");
      return;
    }
    router.replace({ pathname: "/events/[id]", params: { id: data.id } });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <Text style={styles.subtle}>This creates a draft — publish it from the edit screen once it's ready.</Text>

      <Text style={label}>Title (English)</Text>
      <TextInput style={styles.input} placeholder="e.g. Riyadh Food Festival" placeholderTextColor={colors.inkFaint} value={titleEn} onChangeText={setTitleEn} />

      <Text style={label}>Title (Arabic)</Text>
      <TextInput style={styles.input} placeholder="مثال: مهرجان الطعام" placeholderTextColor={colors.inkFaint} value={titleAr} onChangeText={setTitleAr} />

      <Text style={label}>City</Text>
      <TextInput style={styles.input} placeholder="Riyadh" placeholderTextColor={colors.inkFaint} value={venueCity} onChangeText={setVenueCity} />

      <Text style={label}>Venue name (optional)</Text>
      <TextInput style={styles.input} placeholder="e.g. King Fahd Stadium" placeholderTextColor={colors.inkFaint} value={venueName} onChangeText={setVenueName} />

      <Text style={label}>Start date & time</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable style={[styles.outlineButton, { flex: 1 }]} onPress={() => setShowPicker("date")}>
          <Text style={styles.outlineButtonText}>{startsAt.toLocaleDateString()}</Text>
        </Pressable>
        <Pressable style={[styles.outlineButton, { flex: 1 }]} onPress={() => setShowPicker("time")}>
          <Text style={styles.outlineButtonText}>{startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
        </Pressable>
      </View>
      {showPicker && (
        <DateTimePicker
          value={startsAt}
          mode={showPicker}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_event, selected) => {
            setShowPicker(null);
            if (!selected) return;
            setStartsAt((prev) => {
              const next = new Date(prev);
              if (showPicker === "date") next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
              else next.setHours(selected.getHours(), selected.getMinutes());
              return next;
            });
          }}
        />
      )}

      {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

      <Pressable style={[styles.goldButton, { marginTop: 24 }, !canSubmit && styles.disabled]} onPress={handleSubmit} disabled={!canSubmit}>
        {saving ? <ActivityIndicator color={colors.midnight} /> : <Text style={styles.goldButtonText}>Create draft</Text>}
      </Pressable>
    </ScrollView>
  );
}
