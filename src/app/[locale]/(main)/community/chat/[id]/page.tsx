import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import Navbar from "@/components/layout/Navbar";
import ChatThread from "@/components/community/ChatThread";
import type { Conversation, DirectoryProfile, Message } from "@/types";

export const metadata: Metadata = { robots: { index: false, follow: false } };

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function ChatPage({ params }: PageProps) {
  const { id } = await params;
  const locale = await getLocale();
  const isRTL = locale === "ar";
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/community/chat/${id}`);

  // RLS (conversations_read_participant) already restricts this to rows the
  // signed-in user is a participant of -- a non-participant / bad id both
  // resolve to "no row", which is exactly what should 404 here.
  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .single();

  if (!conversation) notFound();
  const typedConversation = conversation as Conversation;

  let title = isRTL ? "محادثة" : "Chat";
  let subtitle: string | null = null;
  let otherUserId: string | null = null;

  if (typedConversation.kind === "dm") {
    otherUserId =
      typedConversation.dm_user_a === user.id ? typedConversation.dm_user_b : typedConversation.dm_user_a;
    if (otherUserId) {
      const { data: other } = await supabase
        .from("directory_profiles")
        .select("*")
        .eq("id", otherUserId)
        .single();
      const otherProfile = other as DirectoryProfile | null;
      title = otherProfile?.full_name ?? (isRTL ? "مستخدم سناتيكس" : "Sanatix user");
    }
  } else if (typedConversation.kind === "event_group") {
    const { data: event } = await supabase
      .from("events")
      .select("title_ar, title_en")
      .eq("id", typedConversation.source_id!)
      .single();
    title = (isRTL ? event?.title_ar : event?.title_en) ?? (isRTL ? "محادثة الفعالية" : "Event chat");
    subtitle = isRTL ? "محادثة جماعية لجميع حضور هذه الفعالية" : "Group chat for everyone attending this event";
  } else if (typedConversation.kind === "party_group") {
    const { data: party } = await supabase
      .from("parties")
      .select("title")
      .eq("id", typedConversation.source_id!)
      .single();
    title = party?.title ?? (isRTL ? "محادثة الحفلة" : "Party chat");
    subtitle = isRTL ? "محادثة جماعية لجميع ضيوف هذه الحفلة" : "Group chat for everyone invited to this party";
  }

  const { data: messageRows } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .limit(200);

  return (
    <div className="min-h-screen bg-brand-warm-white flex flex-col">
      <Navbar />
      <ChatThread
        conversationId={id}
        conversationKind={typedConversation.kind}
        myId={user.id}
        otherUserId={otherUserId}
        title={title}
        subtitle={subtitle}
        initialMessages={(messageRows ?? []) as Message[]}
        isRTL={isRTL}
      />
    </div>
  );
}
