import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/lib/auth-context";
import { Sentry } from "@/lib/sentry";
import { useOTAUpdates } from "@/lib/updates";

function RootLayout() {
  useOTAUpdates();

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: "#0F0F14" }, headerTintColor: "#F5F4F0" }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "Log in" }} />
        <Stack.Screen name="register" options={{ title: "Register" }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="parties/new" options={{ title: "New Party" }} />
        <Stack.Screen name="parties/[id]" options={{ title: "Party" }} />
        <Stack.Screen name="parties/[id]/pick-contacts" options={{ title: "Pick Guests", presentation: "modal" }} />
        <Stack.Screen name="events/new" options={{ title: "New Event" }} />
        <Stack.Screen name="events/[id]/index" options={{ title: "Edit Event" }} />
        <Stack.Screen name="events/[id]/attendees" options={{ title: "Attendees" }} />
        <Stack.Screen name="campaigns/new" options={{ title: "New Campaign" }} />
        <Stack.Screen name="campaigns/[id]" options={{ title: "Campaign" }} />
      </Stack>
    </AuthProvider>
  );
}

// Sentry.wrap adds a top-level error boundary plus app-start/navigation
// performance tracing. It's a harmless passthrough when no DSN is set
// (src/lib/sentry.ts never calls Sentry.init in that case).
export default Sentry.wrap(RootLayout);
