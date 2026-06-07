import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const supabase = await createClient();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Run all queries in parallel
  const [
    usersResult,
    activeUsersResult,
    eventsResult,
    pendingEventsResult,
    bookingsResult,
    revenueResult,
    vendorsResult,
    pendingVendorsResult,
    reportsResult,
    recentBookingsResult,
    topEventsResult,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("updated_at", sevenDaysAgoISO),
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("event_status", "pending"),
    supabase.from("bookings").select("id", { count: "exact", head: true }),
    supabase
      .from("bookings")
      .select("total_amount, currency, status")
      .eq("status", "confirmed"),
    supabase.from("vendors").select("id", { count: "exact", head: true }),
    supabase
      .from("vendors")
      .select("id", { count: "exact", head: true })
      .eq("admin_verified", false),
    supabase
      .from("content_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("bookings")
      .select(
        "id, total_amount, currency, status, created_at, user_id, event_id"
      )
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("events")
      .select("id, title_ar, title_en, view_count, venue_city")
      .order("view_count", { ascending: false })
      .limit(5),
  ]);

  // Calculate total revenue
  const totalRevenue =
    revenueResult.data?.reduce((sum, b) => sum + (b.total_amount ?? 0), 0) ?? 0;

  // Revenue by currency
  const revenueByCurrency: Record<string, number> = {};
  revenueResult.data?.forEach((b) => {
    const cur = b.currency ?? "SAR";
    revenueByCurrency[cur] = (revenueByCurrency[cur] ?? 0) + (b.total_amount ?? 0);
  });

  return NextResponse.json({
    users: {
      total: usersResult.count ?? 0,
      activeLastWeek: activeUsersResult.count ?? 0,
    },
    events: {
      total: eventsResult.count ?? 0,
      pending: pendingEventsResult.count ?? 0,
    },
    bookings: {
      total: bookingsResult.count ?? 0,
    },
    revenue: {
      total: totalRevenue,
      byCurrency: revenueByCurrency,
    },
    vendors: {
      total: vendorsResult.count ?? 0,
      pendingVerification: pendingVendorsResult.count ?? 0,
    },
    reports: {
      pending: reportsResult.count ?? 0,
    },
    recentBookings: recentBookingsResult.data ?? [],
    topEvents: topEventsResult.data ?? [],
  });
}
