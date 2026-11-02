import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  amount: z.number().positive().max(1_000_000),
  is_anonymous: z.boolean().optional().default(false),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  // Only back a campaign that's still actually open — campaigns_read_active
  // / campaigns_read_resolved let anyone SEE a funded/expired/cancelled
  // campaign, but backing one that's already closed shouldn't be possible.
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, status, deadline, currency")
    .eq("id", campaignId)
    .single();

  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (campaign.status !== "active" || new Date(campaign.deadline) < new Date()) {
    return NextResponse.json({ error: "This campaign is no longer accepting pledges" }, { status: 400 });
  }

  // No real payment capture yet (see PledgeForm's disclosure) — this
  // records the pledge and the apply_contribution_to_campaign trigger
  // (migration 007) updates campaigns.raised_amount / backer_count.
  const { data, error } = await supabase
    .from("contributions")
    .insert({
      campaign_id: campaignId,
      user_id: user.id,
      amount: parsed.data.amount,
      currency: campaign.currency,
      is_anonymous: parsed.data.is_anonymous,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
