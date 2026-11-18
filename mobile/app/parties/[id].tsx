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
  Modal,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Plus, Share2, Trash2, Users as UsersIcon, RefreshCw, DoorOpen, BadgeCheck, MessageCircle, Search, X, MessagesSquare } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { styles, colors } from "@/lib/styles";
import { SITE_URL } from "@/lib/supabase";
import type { DirectoryProfile, Party, PartyGuest, RsvpStatus } from "@/lib/types";

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
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [directory, setDirectory] = useState<DirectoryProfile[]>([]);
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [joiningChat, setJoiningChat] = useState(false);

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

  async function searchDirectory(q: string) {
    setDirectoryLoading(true);
    const { data } = await supabase.rpc("search_directory", { q: q.trim() || null, limit_n: 50 });
    setDirectory((data ?? []) as DirectoryProfile[]);
    setDirectoryLoading(false);
  }

  function openUserPicker() {
    setUserPickerOpen(true);
    searchDirectory("");
  }

  // Adding straight from the directory links user_id immediately and
  // marks them "yes" via add_party_guest_by_user() -- same RPC the web
  // app's GuestManager uses, skipping the rsvp_token/share-link flow
  // since the point is they're already a known account.
  async function handlePickUser(profile: DirectoryProfile) {
    const { data, error } = await supabase.rpc("add_party_guest_by_user", {
      p_party_id: id,
      p_user_id: profile.id,
    });
    if (error) {
      Alert.alert("Couldn't add that guest", "Try again.");
      return;
    }
    setGuests((prev) => [...prev, data as PartyGuest]);
    setUserPickerOpen(false);
  }

  async function messageGuest(userId: string) {
    const { data, error } = await supabase.rpc("start_or_get_dm", { p_other_user_id: userId });
    if (error) {
      Alert.alert("Couldn't start a conversation", "Try again.");
      return;
    }
    router.push({ pathname: "/community/chat/[id]", params: { id: data as string } });
  }

  async function openPartyChat() {
    setJoiningChat(true);
    const { data, error } = await supabase.rpc("join_party_group", { p_party_id: id });
    setJoiningChat(false);
    if (error) {
      Alert.alert("Couldn't open the party chat", "Try again.");
      return;
    }
    router.push({ pathname: "/community/chat/[id]", params: { id: data as string } });
  }

  async function removeGuest(guestId: string) {
    await supabase.from("party_guests").delete().eq("id", guestId);
    load();
  }

  async function toggleCheckedIn(guest: PartyGuest) {
    const nextValue = guest.checked_in_at ? null : new Date().toISOString();
    await supabase.from("party_guests").update({ checked_in_at: nextValue }).eq("id", guest.id);
    load();
  }

  function doorPassUrl() {
    if (!party) return "";
    return `${SITE_URL}/checkin/${party.door_pass_token}`;
  }

  async function shareDoorPass() {
    if (!party) return;
    try {
      await Share.share({
        message: `Door check-in link for "${party.title}" — use this to check guests in: ${doorPassUrl()}`,
      });
    } catch {
      // cancelled
    }
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
  const maybeCount = guests.filter((g) => g.rsvp_status === "maybe").length;
  const noCount = guests.filter((g) => g.rsvp_status === "no").length;
  const checkedInCount = guests.filter((g) => g.checked_in_at).length;

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

            {guests.length > 0 && (
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                <View style={[styles.card, { flex: 1, paddingVertical: 10, alignItems: "center" }]}>
                  <Text style={{ fontWeight: "800", color: colors.ink }}>{maybeCount}</Text>
                  <Text style={[styles.subtle, { fontSize: 10 }]}>Maybe</Text>
                </View>
                <View style={[styles.card, { flex: 1, paddingVertical: 10, alignItems: "center" }]}>
                  <Text style={{ fontWeight: "800", color: colors.ink }}>{noCount}</Text>
                  <Text style={[styles.subtle, { fontSize: 10 }]}>Can&apos;t go</Text>
                </View>
                <View style={[styles.card, { flex: 1, paddingVertical: 10, alignItems: "center" }]}>
                  <Text style={{ fontWeight: "800", color: colors.success }}>
                    {checkedInCount}/{yesCount}
                  </Text>
                  <Text style={[styles.subtle, { fontSize: 10 }]}>Checked in</Text>
                </View>
              </View>
            )}

            <Pressable
              style={[styles.goldButton, { flexDirection: "row", gap: 8, marginBottom: 10 }, joiningChat && styles.disabled]}
              onPress={openPartyChat}
              disabled={joiningChat}
            >
              {joiningChat ? <ActivityIndicator color={colors.midnight} /> : <MessagesSquare size={16} color={colors.midnight} />}
              <Text style={styles.goldButtonText}>Party chat</Text>
            </Pressable>

            <Pressable
              style={[styles.outlineButton, { flexDirection: "row", gap: 8, marginBottom: 10 }]}
              onPress={shareDoorPass}
            >
              <DoorOpen size={16} color={colors.ink} />
              <Text style={styles.outlineButtonText}>Share door check-in link</Text>
            </Pressable>

            <Pressable
              style={[styles.outlineButton, { flexDirection: "row", gap: 8, marginBottom: 10 }]}
              onPress={openUserPicker}
            >
              <Search size={16} color={colors.ink} />
              <Text style={styles.outlineButtonText}>Search Sanatix users</Text>
            </Pressable>

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
                <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: status.color }}>
                    {status.label}
                    {item.rsvp_status === "yes" && item.guest_count > 1 ? ` · ${item.guest_count} guests` : ""}
                  </Text>
                  {item.invite_channel !== "none" && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <MessageCircle size={10} color={colors.inkFaint} />
                      <Text style={[styles.subtle, { fontSize: 10 }]}>
                        {item.invite_channel === "whatsapp" ? "WhatsApp" : "SMS"}
                        {item.invite_status === "sent" ? " sent" : item.invite_status === "failed" ? " failed" : ""}
                      </Text>
                    </View>
                  )}
                  {item.checked_in_at && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <BadgeCheck size={11} color={colors.success} />
                      <Text style={{ fontSize: 10, fontWeight: "700", color: colors.success }}>Checked in</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 14 }}>
                <Pressable onPress={() => toggleCheckedIn(item)}>
                  <BadgeCheck size={18} color={item.checked_in_at ? colors.success : colors.inkFaint} />
                </Pressable>
                {item.user_id ? (
                  <Pressable onPress={() => messageGuest(item.user_id!)}>
                    <MessageCircle size={18} color={colors.ink} />
                  </Pressable>
                ) : (
                  <Pressable onPress={() => shareInvite(item)}>
                    <Share2 size={18} color={colors.ink} />
                  </Pressable>
                )}
                <Pressable onPress={() => removeGuest(item.id)}>
                  <Trash2 size={18} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={userPickerOpen} animationType="slide" onRequestClose={() => setUserPickerOpen(false)}>
        <View style={[styles.screen, { paddingTop: 50 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 10 }}>
            <Text style={styles.h1}>Search Sanatix users</Text>
            <Pressable onPress={() => setUserPickerOpen(false)}>
              <X size={22} color={colors.ink} />
            </Pressable>
          </View>
          <Text style={[styles.subtle, { paddingHorizontal: 20, marginBottom: 10 }]}>
            Adding someone here links their account directly and marks them as going.
          </Text>
          <TextInput
            style={[styles.input, { marginHorizontal: 20 }]}
            placeholder="Search by name..."
            placeholderTextColor={colors.inkFaint}
            value={directoryQuery}
            onChangeText={(v) => {
              setDirectoryQuery(v);
              searchDirectory(v);
            }}
          />
          {directoryLoading ? (
            <ActivityIndicator color={colors.gold} style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={directory.filter((p) => !guests.some((g) => g.user_id === p.id))}
              keyExtractor={(p) => p.id}
              contentContainerStyle={{ padding: 20, gap: 8 }}
              ListEmptyComponent={<Text style={[styles.subtle, { textAlign: "center", marginTop: 20 }]}>No one found</Text>}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.card, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}
                  onPress={() => handlePickUser(item)}
                >
                  <Text style={{ fontWeight: "700", color: colors.ink }}>{item.full_name ?? "Sanatix user"}</Text>
                  <Plus size={16} color={colors.gold} />
                </Pressable>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}
