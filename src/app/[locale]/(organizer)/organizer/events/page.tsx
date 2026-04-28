import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
export default async function EventsListPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: events } = await supabase.from("events").select("id,title_en,title_ar,status").eq("organizer_id", user.id);
  return (<div><Link href="/organizer/events/new">New Event</Link>{events?.map(e => <div key={e.id}>{e.title_en}</div>)}</div>);
}
