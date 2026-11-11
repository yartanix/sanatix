import { useCallback, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Store, MessageSquare, Star, BadgeCheck, LogIn } from "lucide-react-native";
import { useAccessState } from "@/lib/access";
import { AccessGate } from "@/components/AccessGate";
import { supabase } from "@/lib/supabase";
import { styles, colors } from "@/lib/styles";
import type { Vendor } from "@/lib/types";

// The app's main screen is this dashboard — it renders immediately on
// launch, tab bar and all. There is no "must log in first" gate: a
// signed-out visitor sees the same tabbed app shell with a sign-in
// prompt woven into this screen, instead of being bounced to a
// separate full-screen login before anything else appears.
const PREVIEW_FEATURES = [
  { label: "Inquiries", desc: "Respond to new customer leads", Icon: MessageSquare },
  { label: "Reviews", desc: "Reply publicly to customer reviews", Icon: Star },
  { label: "Vendor profile", desc: "Keep your business info current", Icon: Store },
];

export default function Dashboard() {
  const { status, profile } = useAccessState(["supplier", "admin"]);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [newInquiries, setNewInquiries] = useState(0);
  const [vendorLoading, setVendorLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (status !== "ok" || !profile) return;
      let cancelled = false;
      (async () => {
        const { data: v } = await supabase
          .from("vendors")
          .select("*")
          .eq("owner_id", profile.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        setVendor(v as Vendor | null);
        if (v) {
          const { count } = await supabase
            .from("vendor_inquiries")
            .select("id", { count: "exact", head: true })
            .eq("vendor_id", v.id)
            .eq("status", "new");
          if (!cancelled) setNewInquiries(count ?? 0);
        }
        if (!cancelled) setVendorLoading(false);
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
        <Text style={[styles.h1, { marginBottom: 20 }]}>Sanatix Supplier</Text>

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
          <Text style={styles.goldButtonText}>Sign in to your vendor account</Text>
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
    return <AccessGate status={status} roleLabel="vendor" />;
  }

  if (vendorLoading) {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (!vendor) {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center", padding: 24 }]}>
        <Store size={28} color={colors.inkFaint} style={{ marginBottom: 10 }} />
        <Text style={[styles.h1, { textAlign: "center", marginBottom: 6 }]}>No vendor profile yet</Text>
        <Text style={[styles.subtle, { textAlign: "center" }]}>Contact the Sanatix team to get your business added as a vendor.</Text>
      </View>
    );
  }

  const name = vendor.name_en;

  const actions = [
    { label: "Inquiries", badge: newInquiries > 0 ? newInquiries : undefined, Icon: MessageSquare, href: "/inquiries" as const },
    { label: "Reviews", Icon: Star, href: "/reviews" as const },
    { label: "Vendor Profile", Icon: Store, href: "/profile" as const },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
        <Text style={styles.h1}>{name}</Text>
        {vendor.is_verified && <BadgeCheck size={18} color={colors.success} />}
      </View>
      <Text style={[styles.subtle, { marginBottom: 20 }]}>Welcome to your supplier dashboard</Text>

      <View style={{ gap: 10 }}>
        {actions.map((a) => (
          <Pressable key={a.label} onPress={() => router.push(a.href)} style={[styles.card, { flexDirection: "row", alignItems: "center", gap: 12 }]}>
            <a.Icon size={18} color={colors.gold} />
            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.ink, flex: 1 }}>{a.label}</Text>
            {a.badge !== undefined && (
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: `${colors.gold}22` }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: colors.gold }}>{a.badge}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
