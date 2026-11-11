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
        <Stack.Screen name="index" options={{ title: "Sanatix Organizer" }} />
        <Stack.Screen name="login" options={{ title: "Log in", headerShown: false }} />
        <Stack.Screen name="events/index" options={{ title: "Events" }} />
        <Stack.Screen name="events/new" options={{ title: "New Event" }} />
        <Stack.Screen name="events/[id]/index" options={{ title: "Edit Event" }} />
        <Stack.Screen name="events/[id]/attendees" options={{ title: "Attendees" }} />
        <Stack.Screen name="campaigns/index" options={{ title: "Crowdfunding" }} />
        <Stack.Screen name="campaigns/new" options={{ title: "New Campaign" }} />
        <Stack.Screen name="campaigns/[id]" options={{ title: "Campaign" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
      </Stack>
    </AuthProvider>
  );
}

export default Sentry.wrap(RootLayout);
