import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView, Alert } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { styles, colors } from "@/lib/styles";

const label = { fontSize: 13, fontWeight: "600" as const, color: colors.ink, marginTop: 16, marginBottom: 6 };

// Unlike the Events/Crowdfunding tabs, Settings is open to every signed-in
// account regardless of role — both a party host and an organizer need to
// edit their name/phone and sign out, so this screen doesn't use
// useAccessState/AccessGate at all (ported in from the retired
// mobile-organizer app's settings.tsx, with its organizer-only gate
// removed and sign-in handling added for parity with the rest of this app).
export default function SettingsScreen() {
  const { session, loading: authLoading, signOut } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (authLoading || !session) {
      setLoading(false);
      return;
    }
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
  }, [authLoading, session]);

  async function save() {
    if (!session) return;
    setSaving(true);
    await supabase.from("profiles").update({ full_name: fullName.trim() || null, phone: phone.trim() || null }).eq("id", session.user.id);
    setSaving(false);
  }

  // In-app account deletion — required by both stores for any app that
  // lets people create an account (App Store Review Guideline 5.1.1(v),
  // Google Play's account-deletion policy). delete_my_account() only ever
  // deletes the caller's own account (see supabase/migrations/020).
  async function deleteAccount() {
    setDeleting(true);
    const { error } = await supabase.rpc("delete_my_account");
    if (error) {
      setDeleting(false);
      Alert.alert(
        "Couldn't delete account",
        error.message.includes("ACCOUNT_HAS_ACTIVE_COMMITMENTS")
          ? "Other people still hold bookings or contributions on your events or campaigns. Cancel those first, or email support@sanatix.net and we'll help."
          : "Something went wrong. Please try again, or email support@sanatix.net.",
      );
      return;
    }
    // The server-side session died with the account; this just clears the
    // locally stored one so the app returns to the signed-out state.
    await signOut().catch(() => {});
    setDeleting(false);
    router.replace("/login");
  }

  function confirmDeleteAccount() {
    Alert.alert(
      "Delete account?",
      "This permanently deletes your Sanatix account and everything in it — your parties and guest lists, bookings, reviews, and any events or campaigns you created. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete account", style: "destructive", onPress: deleteAccount },
      ],
    );
  }

  if (authLoading || loading) {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center", padding: 24 }]}>
        <Text style={[styles.h1, { textAlign: "center", marginBottom: 6 }]}>Sign in to continue</Text>
        <Text style={[styles.subtle, { textAlign: "center", marginBottom: 20 }]}>
          Sign in to manage your account settings.
        </Text>
        <Pressable style={styles.goldButton} onPress={() => router.push("/login")}>
          <Text style={styles.goldButtonText}>Sign in</Text>
        </Pressable>
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

      <Pressable
        style={[styles.outlineButton, { marginTop: 32 }]}
        onPress={async () => {
          await signOut();
          router.replace("/login");
        }}
      >
        <Text style={styles.outlineButtonText}>Sign out</Text>
      </Pressable>

      <Pressable
        style={[styles.outlineButton, { marginTop: 12, borderColor: colors.danger }, deleting && styles.disabled]}
        onPress={confirmDeleteAccount}
        disabled={deleting}
        accessibilityRole="button"
        accessibilityLabel="Delete account"
      >
        {deleting ? (
          <ActivityIndicator color={colors.danger} />
        ) : (
          <Text style={[styles.outlineButtonText, { color: colors.danger }]}>Delete account</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
