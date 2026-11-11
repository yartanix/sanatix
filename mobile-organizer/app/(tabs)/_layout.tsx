import { Tabs } from "expo-router";
import { LayoutDashboard, CalendarDays, HeartHandshake, Settings as SettingsIcon } from "lucide-react-native";
import { colors } from "@/lib/styles";

// The persistent bottom-tab shell IS the app's main screen now — it
// mounts immediately on launch regardless of auth state (see each
// tab's own AccessGate for what a signed-out/wrong-role viewer sees in
// its place). Nothing here redirects the whole app to a login screen.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.midnight },
        headerTintColor: colors.warmWhite,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: { backgroundColor: colors.cardBg, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Dashboard", tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="events"
        options={{ title: "Events", tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="campaigns"
        options={{ title: "Crowdfunding", tabBarIcon: ({ color, size }) => <HeartHandshake color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: "Settings", tabBarIcon: ({ color, size }) => <SettingsIcon color={color} size={size} /> }}
      />
    </Tabs>
  );
}
