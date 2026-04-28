import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
export const metadata = { title: "Organizer Dashboard - Sanatix" };
export default async function OrganizerDashboard() {
  const supabase = await createClient();
  const locale = await getLocale();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: events } = await supabase.from("events").select("id,title_en,title_ar,status,starts_at").eq("organizer_id", user.id);
  return (<div><h1>Organizer Hub</h1><p>Total events: {events?.length}</p><Link href="/organizer/events">My Events</Link></div>);
}
