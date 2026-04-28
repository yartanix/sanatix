import { getLocale } from "next-intl/server";
import EventForm from "@/components/organizer/EventForm";
export default async function NewEventPage() {
  const locale = await getLocale();
  return <EventForm locale={locale} mode="create" />;
}
