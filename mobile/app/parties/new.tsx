import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView, Platform, Switch } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { styles, colors } from "@/lib/styles";

export default function NewPartyScreen() {
  const { session } = useAuth();
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState<Date>(() => {
    const d = new Date();
    d.setHours(17, 0, 0, 0);
    d.setDate(d.getDate() + 7);
    return d;
  });
  const [showPicker, setShowPicker] = useState<"date" | "time" | null>(null);
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [allowPlusOnes, setAllowPlusOnes] = useState(true);
  const [customQuestion, setCustomQuestion] = useState("");
  const [requireEntryCode, setRequireEntryCode] = useState(false);
  const [autoSendChannel, setAutoSendChannel] = useState<"none" | "whatsapp" | "sms">("none");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canSubmit = title.trim().length > 0 && !saving && !!session;

  async function handleSubmit() {
    if (!canSubmit || !session) return;
    setSaving(true);
    setErrorMsg(null);
    const { data, error } = await supabase
      .from("parties")
      .insert({
        host_id: session.user.id,
        title: title.trim(),
        starts_at: startsAt.toISOString(),
        location_name: locationName.trim() || null,
        location_address: locationAddress.trim() || null,
        notes: notes.trim() || null,
        allow_plus_ones: allowPlusOnes,
        custom_question: customQuestion.trim() || null,
        require_entry_code: requireEntryCode,
        entry_code: requireEntryCode ? Math.random().toString(36).slice(2, 8).toUpperCase() : null,
        auto_send_channel: autoSendChannel,
      })
      .select()
      .single();

    setSaving(false);
    if (error || !data) {
      setErrorMsg("Couldn't create the party — try again");
      return;
    }
    router.replace({ pathname: "/parties/[id]", params: { id: data.id } });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <Text style={[styles.subtle, { marginBottom: 20 }]}>
        After creating it, you&apos;ll add guests and share their invites
      </Text>

      <Text style={label}>Party title</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Sarah's Birthday"
        placeholderTextColor={colors.inkFaint}
        value={title}
        onChangeText={setTitle}
      />

      <Text style={label}>Date & time</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable style={[styles.outlineButton, { flex: 1 }]} onPress={() => setShowPicker("date")}>
          <Text style={styles.outlineButtonText}>{startsAt.toLocaleDateString()}</Text>
        </Pressable>
        <Pressable style={[styles.outlineButton, { flex: 1 }]} onPress={() => setShowPicker("time")}>
          <Text style={styles.outlineButtonText}>
            {startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
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
              if (showPicker === "date") {
                next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
              } else {
                next.setHours(selected.getHours(), selected.getMinutes());
              }
              return next;
            });
          }}
        />
      )}

      <Text style={label}>Location name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Our house, Party Hall"
        placeholderTextColor={colors.inkFaint}
        value={locationName}
        onChangeText={setLocationName}
      />

      <Text style={label}>Address</Text>
      <TextInput
        style={styles.input}
        placeholder="Full address (optional)"
        placeholderTextColor={colors.inkFaint}
        value={locationAddress}
        onChangeText={setLocationAddress}
      />

      <Text style={label}>Notes for guests</Text>
      <TextInput
        style={[styles.input, { height: 90, textAlignVertical: "top" }]}
        placeholder="e.g. bring a swimsuit, dress code..."
        placeholderTextColor={colors.inkFaint}
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      <Text style={label}>Ask guests a question (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Any food allergies?"
        placeholderTextColor={colors.inkFaint}
        value={customQuestion}
        onChangeText={setCustomQuestion}
      />

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18 }}>
        <Text style={{ fontSize: 14, color: colors.ink }}>Allow guests to bring plus-ones</Text>
        <Switch value={allowPlusOnes} onValueChange={setAllowPlusOnes} trackColor={{ true: colors.gold }} />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={{ fontSize: 14, color: colors.ink }}>Require an entry code at the door</Text>
          <Text style={[styles.subtle, { fontSize: 11, marginTop: 2 }]}>We&apos;ll generate one automatically</Text>
        </View>
        <Switch value={requireEntryCode} onValueChange={setRequireEntryCode} trackColor={{ true: colors.gold }} />
      </View>

      <Text style={label}>Auto-send invites via</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(
          [
            { key: "none", label: "Manual" },
            { key: "whatsapp", label: "WhatsApp" },
            { key: "sms", label: "SMS" },
          ] as const
        ).map((opt) => (
          <Pressable
            key={opt.key}
            onPress={() => setAutoSendChannel(opt.key)}
            style={[
              styles.outlineButton,
              { flex: 1, paddingVertical: 10 },
              autoSendChannel === opt.key && { borderColor: colors.gold, backgroundColor: colors.goldLight + "22" },
            ]}
          >
            <Text style={styles.outlineButtonText}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>
      {autoSendChannel !== "none" && (
        <Text style={[styles.subtle, { fontSize: 11, marginTop: 6 }]}>
          Only sent to guests you give a phone number for on the web dashboard — adding guests here still uses
          share links for now.
        </Text>
      )}

      {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

      <Pressable
        style={[styles.goldButton, { marginTop: 22 }, !canSubmit && styles.disabled]}
        onPress={handleSubmit}
        disabled={!canSubmit}
      >
        {saving ? (
          <ActivityIndicator color={colors.midnight} />
        ) : (
          <Text style={styles.goldButtonText}>Create party & invite guests</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const label = { fontSize: 12, fontWeight: "700" as const, color: colors.inkFaint, marginTop: 16, marginBottom: 6 };
