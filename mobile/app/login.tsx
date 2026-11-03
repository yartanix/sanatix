import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { styles, colors } from "@/lib/styles";

// Reuses the exact same Supabase auth project as sanatix.net — an
// account created on the web works here, and vice versa.
export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password) return;
    setLoading(true);
    setErrorMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    router.replace("/parties");
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ padding: 24, justifyContent: "center", flex: 1 }}>
        <Text style={styles.h1}>Log in to Sanatix</Text>
        <Text style={[styles.subtle, { marginBottom: 24 }]}>
          Use the same account you use on sanatix.net
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.inkFaint}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={[styles.input, { marginTop: 10 }]}
          placeholder="Password"
          placeholderTextColor={colors.inkFaint}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

        <Pressable
          style={[styles.goldButton, { marginTop: 18 }, (loading || !email || !password) && styles.disabled]}
          onPress={handleLogin}
          disabled={loading || !email || !password}
        >
          {loading ? <ActivityIndicator color={colors.midnight} /> : <Text style={styles.goldButtonText}>Log in</Text>}
        </Pressable>

        <Text style={[styles.subtle, { textAlign: "center", marginTop: 20 }]}>
          Don&apos;t have an account? Sign up at sanatix.net — account creation isn&apos;t built into this
          app yet.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
