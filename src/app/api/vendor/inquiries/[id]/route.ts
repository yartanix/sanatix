import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { NextResponse } from "next/server";

const respondSchema = z.object({
  vendorResponse: z.string().min(1).max(2000),
  status: z.enum(["responded", "closed"]).optional(),
});

// Responding is the only write a vendor can make on an inquiry — the
// DB trigger (enforce_vendor_inquiries_response_only, migration 016)
// is the real enforcement; this route just gives it a narrow, typed
// surface rather than forwarding an arbitrary PATCH body.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = respondSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("vendor_inquiries")
    .update({
      vendor_response: parsed.data.vendorResponse,
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
