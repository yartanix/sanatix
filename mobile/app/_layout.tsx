import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/lib/auth-context";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: "#0F0F14" }, headerTintColor: "#F5F4F0" }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "Log in" }} />
        <Stack.Screen name="parties/index" options={{ title: "My Parties" }} />
        <Stack.Screen name="parties/new" options={{ title: "New Party" }} />
        <Stack.Screen name="parties/[id]" options={{ title: "Party" }} />
        <Stack.Screen name="parties/[id]/pick-contacts" options={{ title: "Pick Guests", presentation: "modal" }} />
      </Stack>
    </AuthProvider>
  );
}
