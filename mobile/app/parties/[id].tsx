import { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Share,
  Alert,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Plus, Share2, Trash2, Users as UsersIcon, RefreshCw } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { styles, colors } from "@/lib/styles";
import { SITE_URL } from "@/lib/supabase";
import type { Party, PartyGuest, RsvpStatus } from "@/lib/types";

// Mirrors the web app's GuestManager.tsx: manual add, a link out to the
// native contacts picker, per-guest share using RN's own Share API (the
// "share-sheet" social integration the user chose — WhatsApp, Instagram,
// Snapchat and TikTok all accept a shared link through the OS share
// sheet; none of them expose a public API to send a DM to an arbitrary
// person, so this is the full extent of "integration" that's possible).
const STATUS_LABEL: Record<RsvpStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: colors.inkFaint },
  yes: { label: "Yes", color: colors.success },
  no: { label: "No", color: colors.danger },
  maybe: { label: "Maybe", color: colors.warning },
};

export default function PartyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [party, setParty] = useState<Party | null>(null);
  const [guests, setGuests] = useState<PartyGuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const { data: partyData } = await supabase.from("parties").select("*").eq("id", id).single();
    const { data: guestData } = await supabase
      .from("party_guests")
      .select("*")
      .eq("party_id", id)
      .order("created_at", { ascending: true });
    setParty((partyData as Party) ?? null);
    setGuests((guestData as PartyGuest[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    load();
  }

  async function addGuest() {
    if (!name.trim() || !id) return;
    setAdding(true);
    const { error } = await supabase
      .from("party_guests")
      .insert({ party_id: id, name: name.trim(), phone: phone.trim() || null });
    setAdding(false);
    if (!error) {
      setName("");
      setPhone("");
      load();
    } else {
      Alert.alert("Couldn't add guest", "Try again.");
    }
  }

  async function removeGuest(guestId: string) {
    await supabase.from("party_guests").delete().eq("id", guestId);
    load();
  }

  function rsvpUrl(token: string) {
    // Same locale-prefix convention as the web app's routing config
    // (localePrefix: "as-needed" — Arabic/default has no prefix).
    return `${SITE_URL}/rsvp/${token}`;
  }

  async function shareInvite(guest: PartyGuest) {
    if (!party) return;
    const when = new Date(party.starts_at).toLocaleString();
    const message = `You're invited to ${party.title}! ${when}${
      party.location_name ? ` at ${party.location_name}` : ""
    }. RSVP here: ${rsvpUrl(guest.rsvp_token)}`;
    try {
      await Share.share({ message });
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  }

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (!party) {
    return (
      <View style={[styles.screen, { justifyContent: "center", alignItems: "center", padding: 20 }]}>
        <Text style={styles.subtle}>This party couldn&apos;t be found.</Text>
      </View>
    );
  }

  const yesCount = guests.filter((g) => g.rsvp_status === "yes").length;

  return (
    <View style={styles.screen}>
      <FlatList
        data={guests}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        ListHeaderComponent={
          <View style={{ marginBottom: 18 }}>
            <Text style={styles.h1}>{party.title}</Text>
            <Text style={[styles.subtle, { marginTop: 4 }]}>{new Date(party.starts_at).toLocaleString()}</Text>
            {party.location_name && <Text style={styles.subtle}>{party.location_name}</Text>}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 18,
                marginBottom: 10,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <UsersIcon size={14} color={colors.ink} />
                <Text style={{ fontWeight: "700", color: colors.ink }}>
                  {yesCount} / {guests.length} confirmed
                </Text>
              </View>
              <Pressable
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                onPress={() => {
                  setRefreshing(true);
                  load();
                }}
              >
                <RefreshCw size={14} color={colors.inkFaint} />
                <Text style={[styles.subtle, { fontWeight: "600" }]}>Refresh</Text>
              </Pressable>
            </View>

            <Pressable
              style={[styles.outlineButton, { flexDirection: "row", gap: 8, marginBottom: 14 }]}
              onPress={() => router.push({ pathname: "/parties/[id]/pick-contacts", params: { id: party.id } })}
            >
              <UsersIcon size={16} color={colors.ink} />
              <Text style={styles.outlineButtonText}>Pick from contacts</Text>
            </Pressable>

            <Text style={[styles.subtle, { fontWeight: "700", marginBottom: 6, color: colors.ink }]}>
              Add a guest
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor={colors.inkFaint}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              placeholder="Phone (optional)"
              placeholderTextColor={colors.inkFaint}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <Pressable
              style={[styles.goldButton, { marginTop: 10, flexDirection: "row", gap: 6 }, (!name.trim() || adding) && styles.disabled]}
              onPress={addGuest}
              disabled={!name.trim() || adding}
            >
              {adding ? (
                <ActivityIndicator color={colors.midnight} />
              ) : (
                <>
                  <Plus size={16} color={colors.midnight} />
                  <Text style={styles.goldButtonText}>Add guest</Text>
                </>
              )}
            </Pressable>

            <Text style={[styles.subtle, { fontWeight: "700", marginTop: 22, marginBottom: 6, color: colors.ink }]}>
              Guests
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={[styles.subtle, { textAlign: "center", paddingVertical: 20 }]}>
            No guests yet — add one above or pick from contacts.
          </Text>
        }
        renderItem={({ item }) => {
          const status = STATUS_LABEL[item.rsvp_status];
          return (
            <View
              style={[
                styles.card,
                { marginBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
              ]}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontWeight: "700", color: colors.ink }}>{item.name}</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: status.color, marginTop: 2 }}>
                  {status.label}
                  {item.rsvp_status === "yes" && item.guest_count > 1 ? ` · ${item.guest_count} guests` : ""}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 14 }}>
                <Pressable onPress={() => shareInvite(item)}>
                  <Share2 size={18} color={colors.ink} />
                </Pressable>
                <Pressable onPress={() => removeGuest(item.id)}>
                  <Trash2 size={18} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}
