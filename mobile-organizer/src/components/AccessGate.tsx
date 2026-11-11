import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { LogIn, ShieldAlert } from "lucide-react-native";
import { useAuth } from "@/lib/auth-context";
import { styles, colors } from "@/lib/styles";
import type { AccessStatus } from "@/lib/access";

// Renders in place of a tab's real content when the viewer isn't signed
// in yet, or is signed in with the wrong role. Deliberately never
// navigates away on its own — the tab bar and this screen stay on
// screen; "Sign in" is something the viewer chooses to tap, not
// something that happens to them on launch.
export function AccessGate({ status, roleLabel, feature }: { status: AccessStatus; roleLabel: string; feature?: string }) {
  const { signOut } = useAuth();

  if (status === "loading") {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (status === "signed-out") {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center", padding: 24 }]}>
        <LogIn size={28} color={colors.inkFaint} style={{ marginBottom: 10 }} />
        <Text style={[styles.h1, { textAlign: "center", marginBottom: 6 }]}>Sign in to continue</Text>
        <Text style={[styles.subtle, { textAlign: "center", marginBottom: 20 }]}>
          {feature ? `Sign in with your ${roleLabel} account to see ${feature}.` : `Sign in with your ${roleLabel} account.`}
        </Text>
        <Pressable style={styles.goldButton} onPress={() => router.push("/login")}>
          <Text style={styles.goldButtonText}>Sign in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { alignItems: "center", justifyContent: "center", padding: 24 }]}>
      <ShieldAlert size={28} color={colors.danger} style={{ marginBottom: 10 }} />
      <Text style={[styles.h1, { textAlign: "center", marginBottom: 6 }]}>Not a {roleLabel} account</Text>
      <Text style={[styles.subtle, { textAlign: "center", marginBottom: 20 }]}>
        This app is for Sanatix {roleLabel}s. Sign out and log in with a {roleLabel} account to continue.
      </Text>
      <Pressable style={styles.outlineButton} onPress={signOut}>
        <Text style={styles.outlineButtonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}
