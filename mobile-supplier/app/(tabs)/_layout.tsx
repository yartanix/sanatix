import { Tabs } from "expo-router";
import { LayoutDashboard, MessageSquare, Star, Store } from "lucide-react-native";
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
        name="inquiries"
        options={{ title: "Inquiries", tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="reviews"
        options={{ title: "Reviews", tabBarIcon: ({ color, size }) => <Star color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Vendor Profile", tabBarIcon: ({ color, size }) => <Store color={color} size={size} /> }}
      />
    </Tabs>
  );
}
