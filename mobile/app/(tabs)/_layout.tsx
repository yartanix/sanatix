import { Tabs } from "expo-router";
import { PartyPopper, CalendarDays, HeartHandshake, Settings as SettingsIcon } from "lucide-react-native";
import { colors } from "@/lib/styles";

// The persistent bottom-tab shell for the unified app. Parties and
// Settings are open to every signed-in account regardless of role
// (hosting a party isn't organizer-exclusive); Events and Crowdfunding
// are organizer tools and render their own AccessGate in place of
// real content for a signed-in viewer whose profile role isn't
// "organizer"/"admin" (see src/lib/access.ts) rather than hiding the
// tab outright, mirroring how the retired mobile-organizer app handled
// a wrong-role viewer.
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
        name="parties"
        options={{ title: "My Parties", tabBarIcon: ({ color, size }) => <PartyPopper color={color} size={size} /> }}
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
