import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { useAccessState } from "@/lib/access";
import { AccessGate } from "@/components/AccessGate";
import { supabase } from "@/lib/supabase";
import { styles, colors } from "@/lib/styles";
import type { Vendor } from "@/lib/types";

const label = { fontSize: 13, fontWeight: "600" as const, color: colors.ink, marginTop: 16, marginBottom: 6 };

export default function VendorProfileScreen() {
  const { status, profile } = useAccessState(["supplier", "admin"]);
  const { signOut } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [city, setCity] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (status !== "ok" || !profile) return;
    supabase
      .from("vendors")
      .select("*")
      .eq("owner_id", profile.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const v = data as Vendor | null;
        setVendor(v);
        if (v) {
          setNameEn(v.name_en);
          setNameAr(v.name_ar);
          setDescriptionEn(v.description_en ?? "");
          setCity(v.city);
          setWhatsapp(v.whatsapp ?? "");
        }
        setLoading(false);
      });
  }, [status, profile]);

  async function save() {
    if (!vendor) return;
    setSaving(true);
    setSaved(false);
    await supabase
      .from("vendors")
      .update({ name_en: nameEn, name_ar: nameAr, description_en: descriptionEn || null, city, whatsapp: whatsapp || null })
      .eq("id", vendor.id);
    setSaving(false);
    setSaved(true);
  }

  if (status !== "ok") {
    return <AccessGate status={status} roleLabel="vendor" feature="your vendor profile" />;
  }

  if (loading) {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (!vendor) {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center", padding: 24 }]}>
        <Text style={[styles.subtle, { marginBottom: 20, textAlign: "center" }]}>No vendor profile linked to your account.</Text>
        <Pressable style={styles.outlineButton} onPress={signOut}>
          <Text style={styles.outlineButtonText}>Sign out</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <Text style={styles.subtle}>
        {vendor.is_verified ? "✓ Verified" : "Pending Sanatix team review"}
      </Text>

      <Text style={label}>Name (English)</Text>
      <TextInput style={styles.input} value={nameEn} onChangeText={setNameEn} />
      <Text style={label}>Name (Arabic)</Text>
      <TextInput style={styles.input} value={nameAr} onChangeText={setNameAr} />
      <Text style={label}>Description (English)</Text>
      <TextInput style={[styles.input, { height: 90, textAlignVertical: "top" }]} multiline value={descriptionEn} onChangeText={setDescriptionEn} />
      <Text style={label}>City</Text>
      <TextInput style={styles.input} value={city} onChangeText={setCity} />
      <Text style={label}>WhatsApp</Text>
      <TextInput style={styles.input} value={whatsapp} onChangeText={setWhatsapp} placeholder="+9665XXXXXXXX" placeholderTextColor={colors.inkFaint} />

      <Pressable style={[styles.goldButton, { marginTop: 20 }]} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color={colors.midnight} /> : <Text style={styles.goldButtonText}>{saved ? "Saved" : "Save"}</Text>}
      </Pressable>

      <Pressable style={[styles.outlineButton, { marginTop: 32 }]} onPress={signOut}>
        <Text style={styles.outlineButtonText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}
