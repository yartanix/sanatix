import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { router } from "expo-router";
import { CalendarDays, HeartHandshake, Settings as SettingsIcon } from "lucide-react-native";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { styles, colors } from "@/lib/styles";
import type { Profile } from "@/lib/types";

export default function Dashboard() {
  const { session, loading, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checking, setChecking] = useState(true);
  const [stats, setStats] = useState({ events: 0, published: 0 });

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, phone, role")
        .eq("id", session.user.id)
        .single();
      setProfile(data as Profile | null);
      setChecking(false);

      const { count: total } = await supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("organizer_id", session.user.id);
      const { count: published } = await supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("organizer_id", session.user.id)
        .eq("status", "published");
      setStats({ events: total ?? 0, published: published ?? 0 });
    })();
  }, [loading, session]);

  if (loading || checking) {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (profile && profile.role !== "organizer" && profile.role !== "admin") {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center", padding: 24 }]}>
        <Text style={[styles.h1, { textAlign: "center", marginBottom: 10 }]}>Not an organizer account</Text>
        <Text style={[styles.subtle, { textAlign: "center", marginBottom: 20 }]}>
          This app is for Sanatix event organizers. Log in with an organizer account to continue.
        </Text>
        <Pressable style={styles.outlineButton} onPress={signOut}>
          <Text style={styles.outlineButtonText}>Sign out</Text>
        </Pressable>
      </View>
    );
  }

  const tiles = [
    { label: "Events", value: String(stats.events), href: "/events" as const, Icon: CalendarDays },
    { label: "Published", value: String(stats.published), href: "/events" as const, Icon: CalendarDays },
  ];

  const actions = [
    { label: "Manage Events", Icon: CalendarDays, href: "/events" as const },
    { label: "Crowdfunding", Icon: HeartHandshake, href: "/campaigns" as const },
    { label: "Settings", Icon: SettingsIcon, href: "/settings" as const },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Text style={[styles.subtle, { marginBottom: 4 }]}>Welcome back</Text>
      <Text style={[styles.h1, { marginBottom: 20 }]}>{profile?.full_name ?? "Organizer"}</Text>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
        {tiles.map((t) => (
          <View key={t.label} style={[styles.card, { flex: 1 }]}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: colors.ink }}>{t.value}</Text>
            <Text style={styles.subtle}>{t.label}</Text>
          </View>
        ))}
      </View>

      <View style={{ gap: 10 }}>
        {actions.map((a) => (
          <Pressable
            key={a.label}
            onPress={() => router.push(a.href)}
            style={[styles.card, { flexDirection: "row", alignItems: "center", gap: 12 }]}
          >
            <a.Icon size={18} color={colors.gold} />
            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.ink }}>{a.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
