import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import EventForm from "@/components/organizer/EventForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Edit Event - Sanatix" };

export default async function EditEventPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const locale = await getLocale();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: event } = await supabase
    .from("events")
    .select("*, ticket_types(*)")
    .eq("id", id)
    .eq("organizer_id", user.id)
    .single();

  if (!event) notFound();

  return <EventForm locale={locale} mode="edit" initialData={event} />;
}
