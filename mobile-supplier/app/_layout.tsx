import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/lib/auth-context";
import { Sentry } from "@/lib/sentry";
import { useOTAUpdates } from "@/lib/updates";
import { colors } from "@/lib/styles";

function RootLayout() {
  useOTAUpdates();

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: colors.midnight }, headerTintColor: colors.warmWhite }}>
        <Stack.Screen name="index" options={{ title: "Sanatix Supplier" }} />
        <Stack.Screen name="login" options={{ title: "Log in", headerShown: false }} />
        <Stack.Screen name="profile" options={{ title: "Vendor Profile" }} />
        <Stack.Screen name="inquiries" options={{ title: "Inquiries" }} />
        <Stack.Screen name="reviews" options={{ title: "Reviews" }} />
      </Stack>
    </AuthProvider>
  );
}

export default Sentry.wrap(RootLayout);
