import { useState } from "react";
import { Text, TextInput, Pressable, ActivityIndicator, ScrollView, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { styles, colors } from "@/lib/styles";

const label = { fontSize: 13, fontWeight: "600" as const, color: colors.ink, marginTop: 16, marginBottom: 6 };

export default function NewCampaignScreen() {
  const { session } = useAuth();
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  });
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const goalNum = Number(goal);
  const canSubmit = titleAr.trim() && titleEn.trim() && goalNum > 0 && !saving && !!session;

  async function handleSubmit() {
    if (!canSubmit || !session) return;
    setSaving(true);
    setErrorMsg(null);
    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        organizer_id: session.user.id,
        title_ar: titleAr.trim(),
        title_en: titleEn.trim(),
        goal_amount: goalNum,
        currency: "SAR",
        deadline: deadline.toISOString(),
      })
      .select()
      .single();

    setSaving(false);
    if (error || !data) {
      setErrorMsg(error?.message ?? "Couldn't create the campaign");
      return;
    }
    router.replace({ pathname: "/campaigns/[id]", params: { id: data.id } });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <Text style={label}>Title (English)</Text>
      <TextInput style={styles.input} value={titleEn} onChangeText={setTitleEn} placeholderTextColor={colors.inkFaint} />
      <Text style={label}>Title (Arabic)</Text>
      <TextInput style={styles.input} value={titleAr} onChangeText={setTitleAr} placeholderTextColor={colors.inkFaint} />
      <Text style={label}>Goal amount (SAR)</Text>
      <TextInput style={styles.input} value={goal} onChangeText={setGoal} keyboardType="numeric" placeholderTextColor={colors.inkFaint} />

      <Text style={label}>Deadline</Text>
      <Pressable style={styles.outlineButton} onPress={() => setShowPicker(true)}>
        <Text style={styles.outlineButtonText}>{deadline.toLocaleDateString()}</Text>
      </Pressable>
      {showPicker && (
        <DateTimePicker
          value={deadline}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_e, selected) => {
            setShowPicker(false);
            if (selected) setDeadline(selected);
          }}
        />
      )}

      {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

      <Pressable style={[styles.goldButton, { marginTop: 24 }, !canSubmit && styles.disabled]} onPress={handleSubmit} disabled={!canSubmit}>
        {saving ? <ActivityIndicator color={colors.midnight} /> : <Text style={styles.goldButtonText}>Create campaign</Text>}
      </Pressable>
    </ScrollView>
  );
}
