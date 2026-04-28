import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import EventForm from "@/components/organizer/EventForm";
export default async function EditEventPage({ params }) {
  const supabase = await createClient();
  const locale = await getLocale();
  const { data: event } = await supabase.from("events").select("*").eq("id", params.id).single();
  if (!event) notFound();
  return <EventForm locale={locale} mode="edit" initialData={event} />;
}
