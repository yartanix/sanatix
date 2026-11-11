import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { router } from "expo-router";
import { Store, MessageSquare, Star, BadgeCheck } from "lucide-react-native";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { styles, colors } from "@/lib/styles";
import type { Profile, Vendor } from "@/lib/types";

export default function Dashboard() {
  const { session, loading, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [newInquiries, setNewInquiries] = useState(0);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("id, full_name, phone, role").eq("id", session.user.id).single();
      setProfile(prof as Profile | null);

      const { data: v } = await supabase
        .from("vendors")
        .select("*")
        .eq("owner_id", session.user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      setVendor(v as Vendor | null);

      if (v) {
        const { count } = await supabase
          .from("vendor_inquiries")
          .select("id", { count: "exact", head: true })
          .eq("vendor_id", v.id)
          .eq("status", "new");
        setNewInquiries(count ?? 0);
      }
      setChecking(false);
    })();
  }, [loading, session]);

  if (loading || checking) {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (profile && profile.role !== "supplier" && profile.role !== "admin") {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center", padding: 24 }]}>
        <Text style={[styles.h1, { textAlign: "center", marginBottom: 10 }]}>Not a supplier account</Text>
        <Text style={[styles.subtle, { textAlign: "center", marginBottom: 20 }]}>
          This app is for Sanatix vendors. Log in with a supplier account to continue.
        </Text>
        <Pressable style={styles.outlineButton} onPress={signOut}>
          <Text style={styles.outlineButtonText}>Sign out</Text>
        </Pressable>
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
