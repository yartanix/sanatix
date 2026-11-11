import { createClient } from "@/lib/supabase/server";
import { clampPagination } from "@/lib/pagination";
import { NextRequest, NextResponse } from "next/server";

// Discovered while scoping the Organizer mobile app: web had a public
// crowdfunding *display* (src/app/[locale]/(main)/crowdfunding) and a
// contributions/pledge endpoint, but no organizer-facing way to create
// or manage a campaign at all — campaigns_manage_own RLS (schema.sql)
// already allows it, nothing in the app surfaced it. Same gap pattern
// as the vendor dashboard; filled the same way, same security posture
// (raised_amount/backer_count/status are locked to the system by the
// existing migration-013 trigger — only the organizer's own
// descriptive fields are writable here).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const { page, limit, offset } = clampPagination(
    searchParams.get("page"),
    searchParams.get("limit"),
    { defaultLimit: 20, maxLimit: 100 }
  );

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error, count } = await supabase
    .from("campaigns")
    .select("*", { count: "exact" })
    .eq("organizer_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    campaigns: data,
    total: count,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  delete body.id;
  delete body.organizer_id;
  delete body.raised_amount;
  delete body.backer_count;
  delete body.status;
  delete body.created_at;
  delete body.updated_at;

  const { data, error } = await supabase
    .from("campaigns")
    .insert({ ...body, organizer_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
