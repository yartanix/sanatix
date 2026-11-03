import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, TextInput } from "react-native";
import * as Contacts from "expo-contacts";
import { router, useLocalSearchParams } from "expo-router";
import { Check } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { styles, colors } from "@/lib/styles";

interface PickableContact {
  id: string;
  name: string;
  phone?: string;
}

export default function PickContactsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [contacts, setContacts] = useState<PickableContact[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        setPermissionDenied(true);
        setLoading(false);
        return;
      }
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
      });
      const mapped: PickableContact[] = data
        .filter((c) => c.name)
        .map((c) => ({
          id: c.id ?? c.name!,
          name: c.name!,
          phone: c.phoneNumbers?.[0]?.number,
        }));
      setContacts(mapped);
      setLoading(false);
    })();
  }, []);

  function toggle(contactId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      return next;
    });
  }

  async function confirm() {
    if (!id || selected.size === 0) return;
    setSaving(true);
    const chosen = contacts.filter((c) => selected.has(c.id));
    const rows = chosen.map((c) => ({ party_id: id, name: c.name, phone: c.phone ?? null }));
    const { error } = await supabase.from("party_guests").insert(rows);
    setSaving(false);
    if (!error) {
      router.back();
    }
  }

  const filtered = contacts.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (permissionDenied) {
    return (
      <View style={[styles.screen, { justifyContent: "center", alignItems: "center", padding: 24 }]}>
        <Text style={[styles.subtle, { textAlign: "center" }]}>
          Contacts access was declined. You can still add guests manually from the party screen, or allow
          contacts access for Sanatix in your device settings.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <TextInput
          style={styles.input}
          placeholder="Search contacts"
          placeholderTextColor={colors.inkFaint}
          value={query}
          onChangeText={setQuery}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 100 }}
        ListEmptyComponent={
          <Text style={[styles.subtle, { textAlign: "center", paddingVertical: 20 }]}>
            No contacts match that search.
          </Text>
        }
        renderItem={({ item }) => {
          const isSelected = selected.has(item.id);
          return (
            <Pressable
              style={[
                styles.card,
                {
                  marginBottom: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderColor: isSelected ? colors.gold : "rgba(0,0,0,0.05)",
                },
              ]}
              onPress={() => toggle(item.id)}
            >
              <View>
                <Text style={{ fontWeight: "700", color: colors.ink }}>{item.name}</Text>
                {item.phone && <Text style={styles.subtle}>{item.phone}</Text>}
              </View>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: isSelected ? colors.gold : colors.border,
                  backgroundColor: isSelected ? colors.gold : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isSelected && <Check size={14} color={colors.midnight} />}
              </View>
            </Pressable>
          );
        }}
      />

      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          backgroundColor: colors.warmWhite,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Pressable
          style={[styles.goldButton, (selected.size === 0 || saving) && styles.disabled]}
          onPress={confirm}
          disabled={selected.size === 0 || saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.midnight} />
          ) : (
            <Text style={styles.goldButtonText}>
              Add {selected.size > 0 ? selected.size : ""} guest{selected.size === 1 ? "" : "s"}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
