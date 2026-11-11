import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { styles, colors } from "@/lib/styles";

// The mobile-only entry point for "I am joining as a..." (the web
// register page's role picker, minus Supplier — suppliers have their
// own separate app). Sent as raw_user_meta_data.role, read by the
// handle_new_user() DB trigger (see
// supabase/migrations/018_signup_role_and_phone.sql and
// 019_fix_handle_new_user_search_path.sql) which is what actually sets
// profiles.role — this screen itself doesn't grant anything on its own.
type JoinRole = "customer" | "organizer";

const ROLE_OPTIONS: { value: JoinRole; label: string; desc: string }[] = [
  { value: "customer", label: "Customer", desc: "Plan parties and attend events" },
  { value: "organizer", label: "Organizer", desc: "Create and manage events" },
];

export default function RegisterScreen() {
  const [role, setRole] = useState<JoinRole>("customer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const canSubmit = fullName.trim().length > 0 && email.trim().length > 0 && password.length >= 8;

  async function handleRegister() {
    if (!canSubmit) return;
    setLoading(true);
    setErrorMsg(null);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim(), phone: phone.trim() || null, role } },
    });
    setLoading(false);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    if (!data.session) {
      // Email confirmation is required before a session exists — same
      // behavior as the web register page.
      setCheckEmail(true);
      return;
    }
    router.replace("/parties");
  }

  if (checkEmail) {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center", padding: 24 }]}>
        <Text style={[styles.h1, { textAlign: "center", marginBottom: 10 }]}>Check your email</Text>
        <Text style={[styles.subtle, { textAlign: "center", marginBottom: 20 }]}>
          We sent a confirmation link to {email.trim()}. Open it, then come back and sign in.
        </Text>
        <Pressable style={styles.goldButton} onPress={() => router.replace("/login")}>
          <Text style={styles.goldButtonText}>Go to sign in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: "center" }}>
        <Text style={styles.h1}>Create your account</Text>
        <Text style={[styles.subtle, { marginBottom: 20 }]}>Join Sanatix</Text>

        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.ink, marginBottom: 8 }}>I am joining as a...</Text>
        <View style={{ gap: 8, marginBottom: 18 }}>
          {ROLE_OPTIONS.map((opt) => {
            const selected = role === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setRole(opt.value)}
                style={[
                  styles.card,
                  { borderColor: selected ? colors.gold : "rgba(0,0,0,0.05)", borderWidth: selected ? 2 : 1 },
                ]}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.ink }}>{opt.label}</Text>
                <Text style={styles.subtle}>{opt.desc}</Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor={colors.inkFaint}
          value={fullName}
          onChangeText={setFullName}
        />
        <TextInput
          style={[styles.input, { marginTop: 10 }]}
          placeholder="Email"
          placeholderTextColor={colors.inkFaint}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={[styles.input, { marginTop: 10 }]}
          placeholder="Phone (optional)"
          placeholderTextColor={colors.inkFaint}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        <TextInput
          style={[styles.input, { marginTop: 10 }]}
          placeholder="Password (min 8 characters)"
          placeholderTextColor={colors.inkFaint}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

        <Pressable
          style={[styles.goldButton, { marginTop: 18 }, (loading || !canSubmit) && styles.disabled]}
          onPress={handleRegister}
          disabled={loading || !canSubmit}
        >
          {loading ? <ActivityIndicator color={colors.midnight} /> : <Text style={styles.goldButtonText}>Create account</Text>}
        </Pressable>

        <Pressable style={{ marginTop: 18, alignItems: "center" }} onPress={() => router.replace("/login")}>
          <Text style={{ color: colors.inkFaint, fontSize: 13 }}>
            Already have an account? <Text style={{ color: colors.gold, fontWeight: "600" }}>Sign in</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
