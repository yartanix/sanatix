"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Ban, Flag, ImagePlus, Loader2, Send, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/routing";
import type { ConversationKind, Message } from "@/types";

interface Props {
  conversationId: string;
  conversationKind: ConversationKind;
  myId: string;
  otherUserId: string | null;
  title: string;
  subtitle: string | null;
  initialMessages: Message[];
  isRTL: boolean;
}

export default function ChatThread({
  conversationId,
  conversationKind,
  myId,
  otherUserId,
  title,
  subtitle,
  initialMessages,
  isRTL,
}: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [blocked, setBlocked] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const supabase = createClient();

    // Best-effort read receipt; nothing in the UI depends on it, so a
    // failure here is silently ignored.
    supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", myId)
      .then(() => {});

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === (payload.new as Message).id)) return prev;
            return [...prev, payload.new as Message];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, myId]);

  async function handleSend(imagePath?: string) {
    const trimmed = body.trim();
    if (!trimmed && !imagePath) return;
    setSending(true);
    setError(null);
    const supabase = createClient();
    const { data, error: sendError } = await supabase.rpc("send_message", {
      p_conversation_id: conversationId,
      p_body: trimmed || null,
      p_image_path: imagePath ?? null,
    });
    setSending(false);

    if (sendError) {
      setError(
        sendError.message?.toLowerCase().includes("cannot message")
          ? isRTL
            ? "لا يمكنك إرسال رسالة في هذه المحادثة."
            : "You can't send a message in this conversation."
          : isRTL
          ? "تعذّر إرسال الرسالة."
          : "Couldn't send that message."
      );
      return;
    }

    setBody("");
    setMessages((prev) => (prev.some((m) => m.id === (data as Message).id) ? prev : [...prev, data as Message]));
  }

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSending(true);
    setError(null);
    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${conversationId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("chat-media").upload(path, file);
    if (uploadError) {
      setSending(false);
      setError(isRTL ? "تعذّر رفع الصورة." : "Couldn't upload that image.");
      return;
    }
    await handleSend(path);
  }

  async function handleBlock() {
    if (!otherUserId) return;
    const supabase = createClient();
    const { error: blockError } = await supabase.rpc("block_user", { p_user_id: otherUserId });
    setMenuOpen(false);
    if (!blockError) setBlocked(true);
  }

  async function handleReport() {
    if (!otherUserId || !reportReason.trim()) return;
    const supabase = createClient();
    await supabase.rpc("report_content", {
      p_target_type: "user",
      p_target_id: otherUserId,
      p_reason: reportReason.trim(),
    });
    setReportOpen(false);
    setReportReason("");
    setMenuOpen(false);
  }

  return (
    <div className="flex-1 flex flex-col max-w-2xl w-full mx-auto">
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-black/5 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/community" className="shrink-0 text-brand-ink/50 hover:text-brand-midnight">
            <ArrowLeft size={18} className={isRTL ? "rotate-180" : ""} />
          </Link>
          <div className="min-w-0">
            <p className="text-sm font-bold text-brand-midnight truncate">{title}</p>
            {subtitle && <p className="text-xs text-brand-ink/45 truncate">{subtitle}</p>}
          </div>
        </div>

        {conversationKind === "dm" && otherUserId && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="text-brand-ink/40 hover:text-brand-midnight p-1.5 -m-1.5"
              aria-label={isRTL ? "خيارات" : "Options"}
            >
              ⋯
            </button>
            {menuOpen && (
              <div
                className={`absolute top-full mt-1 ${isRTL ? "left-0" : "right-0"} bg-white rounded-xl border border-black/5 shadow-lg py-1 w-44 z-10`}
              >
                <button
                  type="button"
                  onClick={handleBlock}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-brand-ink/70 hover:bg-brand-warm-white text-start"
                >
                  <Ban size={13} />
                  {isRTL ? "حظر المستخدم" : "Block user"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setReportOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-brand-ink/70 hover:bg-brand-warm-white text-start"
                >
                  <Flag size={13} />
                  {isRTL ? "الإبلاغ" : "Report"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {reportOpen && (
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-100">
          <p className="text-xs font-semibold text-amber-900 mb-2">
            {isRTL ? "سبب الإبلاغ" : "Reason for reporting"}
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder={isRTL ? "اكتب السبب هنا..." : "Describe the issue..."}
              className="flex-1 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs focus:outline-none"
            />
            <button
              type="button"
              onClick={handleReport}
              disabled={!reportReason.trim()}
              className="text-xs font-semibold text-amber-900 bg-amber-200 rounded-lg px-3 py-1.5 disabled:opacity-50"
            >
              {isRTL ? "إرسال" : "Submit"}
            </button>
            <button type="button" onClick={() => setReportOpen(false)} className="text-amber-700 p-1">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-xs text-brand-ink/40 py-10">
            {isRTL ? "لا توجد رسائل بعد" : "No messages yet"}
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === myId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  mine ? "bg-brand-midnight text-brand-warm-white" : "bg-white border border-black/5 text-brand-midnight"
                }`}
              >
                {m.image_path && (
                  <p className="text-xs italic opacity-70 mb-1">{isRTL ? "[صورة]" : "[photo]"}</p>
                )}
                {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-6 pb-2 text-xs text-red-600">{error}</p>}
      {blocked && (
        <p className="px-6 pb-2 text-xs text-brand-ink/50">
          {isRTL ? "تم حظر هذا المستخدم. لن يتمكن من مراسلتك." : "You've blocked this user. They can no longer message you."}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 px-6 py-4 border-t border-black/5 bg-white"
      >
        <label className="shrink-0 text-brand-ink/40 hover:text-brand-midnight cursor-pointer p-1.5 -m-1.5">
          <ImagePlus size={18} />
          <input type="file" accept="image/*" className="hidden" onChange={handleImagePick} disabled={sending} />
        </label>
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={isRTL ? "اكتب رسالة..." : "Type a message..."}
          disabled={sending}
          className="flex-1 rounded-full border border-black/10 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-gold/50"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-brand-gold-light to-brand-gold disabled:opacity-40 transition-opacity"
          aria-label={isRTL ? "إرسال" : "Send"}
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} className={isRTL ? "rotate-180" : ""} />}
        </button>
      </form>
    </div>
  );
}
