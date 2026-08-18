import { getLocale } from "next-intl/server";
import EventForm from "@/components/organizer/EventForm";

export const metadata = { title: "New Event - Sanatix" };

export default async function NewEventPage() {
  const locale = await getLocale();
  return <EventForm locale={locale} mode="create" />;
}
