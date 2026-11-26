import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { moderateComment } from "@/lib/moderation";

const bodySchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(2000).optional(),
    locale: z.enum(["ar", "en"]).default("en"),
    event_id: z.string().uuid().optional(),
    vendor_id: z.string().uuid().optional(),
  })
  .refine(
    (v) => (v.event_id ? 1 : 0) + (v.vendor_id ? 1 : 0) === 1,
    { message: "Provide exactly one of event_id or vendor_id" }
  );

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const { rating, comment, locale, event_id, vendor_id } = parsed.data;

  // Only let someone review an event they actually attended — a booking
  // that isn't cancelled.
  if (event_id) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("id")
      .eq("user_id", user.id)
      .eq("event_id", event_id)
      .neq("status", "cancelled")
      .limit(1)
      .maybeSingle();
    if (!booking) {
      return NextResponse.json(
        { error: "You can only review events you've booked" },
        { status: 403 }
      );
    }
  }

  // Vendors (Fahoood, Nov 26 2026): only organizers who actually dealt
  // with this vendor may rate them. There's no real vendor-hire/booking
  // record in this product yet, so "dealt with" means they sent this
  // vendor an inquiry (vendor_inquiries) — the closest real signal
  // available. This same rule is enforced again at the DB level
  // (migration 024_vendor_review_eligibility.sql, trigger on reviews) so
  // a direct REST call can't bypass it — this check here just turns that
  // into a friendly error message instead of a raw Postgres exception.
  if (vendor_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "organizer") {
      return NextResponse.json({ error: "Only organizers can rate vendors." }, { status: 403 });
    }

    const { data: inquiry } = await supabase
      .from("vendor_inquiries")
      .select("id")
      .eq("user_id", user.id)
      .eq("vendor_id", vendor_id)
      .limit(1)
      .maybeSingle();
    if (!inquiry) {
      return NextResponse.json(
        { error: "You can only rate a vendor you've contacted." },
        { status: 403 }
      );
    }
  }

  // Moderate the comment (offensive / unlawful content) BEFORE writing
  // anything — fails closed, see src/lib/moderation.ts.
  if (comment) {
    const moderation = await moderateComment(comment);
    if (!moderation.allowed) {
      return NextResponse.json({ error: moderation.reason ?? "This comment can't be published as written." }, { status: 422 });
    }
  }

  const commentAr: string | null = locale === "ar" ? comment ?? null : null;
  const commentEn: string | null = locale === "en" ? comment ?? null : null;

  // One review per user per target — update in place if they already left
  // one rather than creating duplicates (no unique constraint backs this
  // at the DB level, so it's enforced here).
  const existingQuery = supabase
    .from("reviews")
    .select("id")
    .eq("user_id", user.id);
  const { data: existing } = event_id
    ? await existingQuery.eq("event_id", event_id).maybeSingle()
    : await existingQuery.eq("vendor_id", vendor_id!).maybeSingle();

  const row = {
    user_id: user.id,
    event_id: event_id ?? null,
    vendor_id: vendor_id ?? null,
    rating,
    comment_ar: commentAr,
    comment_en: commentEn,
  };

  const { data, error } = existing
    ? await supabase.from("reviews").update(row).eq("id", existing.id).select().single()
    : await supabase.from("reviews").insert(row).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: existing ? 200 : 201 });
}
