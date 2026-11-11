import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { styles, colors } from "@/lib/styles";

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
    router.replace("/");
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Pressable
        style={{ position: "absolute", top: 56, right: 20, zIndex: 1 }}
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      >
        <Text style={{ color: colors.inkFaint, fontWeight: "600" }}>Close</Text>
      </Pressable>
      <View style={{ padding: 24, justifyContent: "center", flex: 1 }}>
        <Text style={styles.h1}>Sanatix Supplier</Text>
        <Text style={[styles.subtle, { marginBottom: 24 }]}>Log in with your vendor account</Text>

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

        <Pressable style={[styles.goldButton, { marginTop: 18 }, loading && styles.disabled]} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.midnight} /> : <Text style={styles.goldButtonText}>Log in</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
