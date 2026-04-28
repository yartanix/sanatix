import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
export default async function AttendeesPage({ params }) {
  return <div>Attendees</div>;
}
