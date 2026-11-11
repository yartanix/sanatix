import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { useAccessState } from "@/lib/access";
import { AccessGate } from "@/components/AccessGate";
import { supabase } from "@/lib/supabase";
import { styles, colors } from "@/lib/styles";

const label = { fontSize: 13, fontWeight: "600" as const, color: colors.ink, marginTop: 16, marginBottom: 6 };

export default function SettingsScreen() {
  const { status, session } = useAccessState(["organizer", "admin"]);
  const { signOut } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status !== "ok" || !session) return;
    supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name ?? "");
          setPhone(data.phone ?? "");
        }
        setLoading(false);
      });
  }, [status, session]);

  async function save() {
    if (!session) return;
    setSaving(true);
    await supabase.from("profiles").update({ full_name: fullName.trim() || null, phone: phone.trim() || null }).eq("id", session.user.id);
    setSaving(false);
  }

  // Signed-out and wrong-role viewers still see the tab bar and this
  // screen's chrome; AccessGate's wrong-role state already offers
  // "Sign out" so there's always a way out of a mismatched account
  // without needing a separate dedicated flow here.
  if (status !== "ok") {
    return <AccessGate status={status} roleLabel="organizer" />;
  }

  if (loading) {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Text style={label}>Full name</Text>
      <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholderTextColor={colors.inkFaint} />
      <Text style={label}>Phone</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor={colors.inkFaint} />

      <Pressable style={[styles.goldButton, { marginTop: 20 }]} onPress={save}>
        {saving ? <ActivityIndicator color={colors.midnight} /> : <Text style={styles.goldButtonText}>Save</Text>}
      </Pressable>

      <Pressable style={[styles.outlineButton, { marginTop: 32 }]} onPress={signOut}>
        <Text style={styles.outlineButtonText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}
