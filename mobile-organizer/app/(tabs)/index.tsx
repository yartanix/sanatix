import { useCallback, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { CalendarDays, HeartHandshake, Settings as SettingsIcon, LogIn, ShieldCheck } from "lucide-react-native";
import { useAccessState } from "@/lib/access";
import { AccessGate } from "@/components/AccessGate";
import { supabase } from "@/lib/supabase";
import { styles, colors } from "@/lib/styles";

// The app's main screen is this dashboard — it renders immediately on
// launch, tab bar and all. There is no "must log in first" gate: a
// signed-out visitor sees the same tabbed app shell with a sign-in
// prompt woven into this screen, instead of being bounced to a
// separate full-screen login before anything else appears. Returning,
// signed-in organizers see their real stats here on every launch
// (session persists via secure storage — see src/lib/auth-context.tsx).
const PREVIEW_FEATURES = [
  { label: "Events", desc: "Create and publish events, Arabic & English", Icon: CalendarDays },
  { label: "Crowdfunding", desc: "Launch and track campaigns", Icon: HeartHandshake },
  { label: "Door check-in", desc: "Check attendees in with a simple code", Icon: ShieldCheck },
];

export default function Dashboard() {
  const { status, profile } = useAccessState(["organizer", "admin"]);
  const [stats, setStats] = useState({ events: 0, published: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (status !== "ok" || !profile) return;
      let cancelled = false;
      (async () => {
        const { count: total } = await supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .eq("organizer_id", profile.id);
        const { count: published } = await supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .eq("organizer_id", profile.id)
          .eq("status", "published");
        if (!cancelled) {
          setStats({ events: total ?? 0, published: published ?? 0 });
          setStatsLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [status, profile])
  );

  if (status === "loading") {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (status === "signed-out") {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.subtle}>Welcome to</Text>
        <Text style={[styles.h1, { marginBottom: 20 }]}>Sanatix Organizer</Text>

        <View style={{ gap: 10, marginBottom: 24 }}>
          {PREVIEW_FEATURES.map((f) => (
            <View key={f.label} style={[styles.card, { flexDirection: "row", alignItems: "center", gap: 12 }]}>
              <f.Icon size={18} color={colors.gold} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.ink }}>{f.label}</Text>
                <Text style={styles.subtle}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable style={[styles.goldButton, { flexDirection: "row", gap: 8 }]} onPress={() => router.push("/login")}>
          <LogIn size={16} color={colors.midnight} />
          <Text style={styles.goldButtonText}>Sign in to your organizer account</Text>
        </Pressable>
        <Pressable style={{ marginTop: 14, alignItems: "center" }} onPress={() => router.push("/register")}>
          <Text style={{ color: colors.inkFaint, fontSize: 13 }}>
            New to Sanatix? <Text style={{ color: colors.gold, fontWeight: "600" }}>Register now</Text>
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (status === "wrong-role") {
    return <AccessGate status={status} roleLabel="organizer" />;
  }

  const tiles = [
    { label: "Events", value: String(stats.events), href: "/events" as const },
    { label: "Published", value: String(stats.published), href: "/events" as const },
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
          <Pressable key={t.label} onPress={() => router.push(t.href)} style={[styles.card, { flex: 1 }]}>
            {statsLoading ? (
              <ActivityIndicator color={colors.gold} />
            ) : (
              <Text style={{ fontSize: 22, fontWeight: "700", color: colors.ink }}>{t.value}</Text>
            )}
            <Text style={styles.subtle}>{t.label}</Text>
          </Pressable>
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
