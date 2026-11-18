import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Crypto from "expo-crypto";
import { Buffer } from "buffer";
import { ArrowLeft, Send, ImagePlus, Ban, Flag, MoreHorizontal } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { styles, colors } from "@/lib/styles";
import type { Conversation, ConversationKind, Message } from "@/lib/types";

// Mirrors the web app's community/chat/[id]/page.tsx + ChatThread.tsx:
// RLS on `conversations` already restricts the read to rows the
// signed-in user participates in, so a bad/foreign id just resolves to
// "not found" here -- no separate authorization check needed.
export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const myId = session?.user?.id ?? "";

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [title, setTitle] = useState("Chat");
  const [subtitle, setSubtitle] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const listRef = useRef<FlatList<Message>>(null);

  const load = useCallback(async () => {
    if (!id || !myId) return;
    const { data: conv } = await supabase.from("conversations").select("*").eq("id", id).single();
    if (!conv) {
      setLoading(false);
      return;
    }
    const typedConv = conv as Conversation;
    setConversation(typedConv);

    if (typedConv.kind === "dm") {
      const other = typedConv.dm_user_a === myId ? typedConv.dm_user_b : typedConv.dm_user_a;
      setOtherUserId(other);
      if (other) {
        const { data: profile } = await supabase.from("directory_profiles").select("*").eq("id", other).single();
        setTitle(profile?.full_name ?? "Sanatix user");
      }
    } else if (typedConv.kind === "event_group") {
      const { data: event } = await supabase.from("events").select("title_en").eq("id", typedConv.source_id!).single();
      setTitle(event?.title_en ?? "Event chat");
      setSubtitle("Group chat for everyone attending this event");
    } else if (typedConv.kind === "party_group") {
      const { data: party } = await supabase.from("parties").select("title").eq("id", typedConv.source_id!).single();
      setTitle(party?.title ?? "Party chat");
      setSubtitle("Group chat for everyone invited to this party");
    }

    const { data: msgRows } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages((msgRows ?? []) as Message[]);
    setLoading(false);

    // Best-effort read receipt — nothing in the UI depends on it.
    supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", id)
      .eq("user_id", myId)
      .then(() => {});
  }, [id, myId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`messages:${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          setMessages((prev) => {
            const next = payload.new as Message;
            if (prev.some((m) => m.id === next.id)) return prev;
            return [...prev, next];
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  async function send(imagePath?: string) {
    const trimmed = body.trim();
    if (!trimmed && !imagePath) return;
    setSending(true);
    const { data, error } = await supabase.rpc("send_message", {
      p_conversation_id: id,
      p_body: trimmed || null,
      p_image_path: imagePath ?? null,
    });
    setSending(false);
    if (error) {
      Alert.alert("Couldn't send", error.message?.toLowerCase().includes("cannot message") ? "You can't send a message in this conversation." : "Try again.");
      return;
    }
    setBody("");
    setMessages((prev) => (prev.some((m) => m.id === (data as Message).id) ? prev : [...prev, data as Message]));
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    const asset = result.assets?.[0];
    const base64 = asset?.base64;
    if (result.canceled || !asset || !base64) return;
    const ext = asset.uri.split(".").pop() || "jpg";
    const path = `${id}/${Crypto.randomUUID()}.${ext}`;
    setSending(true);
    const { error: uploadError } = await supabase.storage
      .from("chat-media")
      .upload(path, Buffer.from(base64, "base64"), { contentType: asset.mimeType ?? `image/${ext}` });
    setSending(false);
    if (uploadError) {
      Alert.alert("Couldn't upload image", "Try again.");
      return;
    }
    await send(path);
  }

  async function handleBlock() {
    if (!otherUserId) return;
    const { error } = await supabase.rpc("block_user", { p_user_id: otherUserId });
    setMenuOpen(false);
    if (!error) setBlocked(true);
  }

  function openReport() {
    if (!otherUserId) return;
    setMenuOpen(false);
    setReportOpen(true);
  }

  async function submitReport() {
    if (!otherUserId || !reportReason.trim()) return;
    await supabase.rpc("report_content", { p_target_type: "user", p_target_id: otherUserId, p_reason: reportReason.trim() });
    setReportOpen(false);
    setReportReason("");
  }

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (!conversation) {
    return (
      <View style={[styles.screen, { justifyContent: "center", alignItems: "center", padding: 20 }]}>
        <Text style={styles.subtle}>This conversation couldn&apos;t be found.</Text>
      </View>
    );
  }

  const kind: ConversationKind = conversation.kind;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: "#fff",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
          <Pressable onPress={() => router.back()}>
            <ArrowLeft size={18} color={colors.inkFaint} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "700", color: colors.ink, fontSize: 14 }} numberOfLines={1}>{title}</Text>
            {subtitle && <Text style={[styles.subtle, { fontSize: 11 }]} numberOfLines={1}>{subtitle}</Text>}
          </View>
        </View>
        {kind === "dm" && otherUserId && (
          <Pressable onPress={() => setMenuOpen((v) => !v)} style={{ padding: 4 }}>
            <MoreHorizontal size={18} color={colors.inkFaint} />
          </Pressable>
        )}
      </View>

      {menuOpen && (
        <View style={{ position: "absolute", top: 54, right: 16, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: colors.border, zIndex: 10, overflow: "hidden" }}>
          <Pressable onPress={handleBlock} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10 }}>
            <Ban size={13} color={colors.ink} />
            <Text style={{ fontSize: 12, color: colors.ink }}>Block user</Text>
          </Pressable>
          <Pressable onPress={openReport} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10 }}>
            <Flag size={13} color={colors.ink} />
            <Text style={{ fontSize: 12, color: colors.ink }}>Report</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={<Text style={[styles.subtle, { textAlign: "center", marginTop: 30 }]}>No messages yet</Text>}
        renderItem={({ item }) => {
          const mine = item.sender_id === myId;
          return (
            <View style={{ alignItems: mine ? "flex-end" : "flex-start" }}>
              <View
                style={{
                  maxWidth: "75%",
                  borderRadius: 16,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  backgroundColor: mine ? colors.midnight : "#fff",
                  borderWidth: mine ? 0 : 1,
                  borderColor: colors.border,
                }}
              >
                {item.image_path && <Text style={{ fontSize: 11, fontStyle: "italic", opacity: 0.7, color: mine ? colors.warmWhite : colors.ink, marginBottom: 4 }}>[photo]</Text>}
                {item.body && <Text style={{ color: mine ? colors.warmWhite : colors.ink, fontSize: 14 }}>{item.body}</Text>}
              </View>
            </View>
          );
        }}
      />

      {blocked && <Text style={[styles.subtle, { paddingHorizontal: 16, paddingBottom: 6 }]}>You&apos;ve blocked this user. They can no longer message you.</Text>}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: "#fff" }}>
        <Pressable onPress={pickImage} disabled={sending}>
          <ImagePlus size={20} color={colors.inkFaint} />
        </Pressable>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Type a message..."
          placeholderTextColor={colors.inkFaint}
          value={body}
          onChangeText={setBody}
          editable={!sending}
        />
        <Pressable
          style={[{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center" }, (sending || !body.trim()) && styles.disabled]}
          onPress={() => send()}
          disabled={sending || !body.trim()}
        >
          {sending ? <ActivityIndicator size="small" color={colors.midnight} /> : <Send size={16} color={colors.midnight} />}
        </Pressable>
      </View>

      <Modal visible={reportOpen} transparent animationType="fade" onRequestClose={() => setReportOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 24 }}>
          <View style={[styles.card, { gap: 10 }]}>
            <Text style={{ fontWeight: "700", color: colors.ink }}>Report this user</Text>
            <TextInput
              style={styles.input}
              placeholder="Describe the issue"
              placeholderTextColor={colors.inkFaint}
              value={reportReason}
              onChangeText={setReportReason}
              multiline
            />
            <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
              <Pressable onPress={() => setReportOpen(false)} style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
                <Text style={{ color: colors.inkFaint, fontWeight: "600" }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={submitReport}
                disabled={!reportReason.trim()}
                style={[styles.goldButton, { paddingHorizontal: 16, paddingVertical: 10 }, !reportReason.trim() && styles.disabled]}
              >
                <Text style={styles.goldButtonText}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
