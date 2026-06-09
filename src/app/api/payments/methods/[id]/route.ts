import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// DELETE /api/payments/methods/:id — soft-delete a payment method
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("payment_methods")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete payment method error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/payments/methods/:id — update a payment method (e.g. set as default)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { is_default } = body as { is_default?: boolean };

    if (is_default) {
      // Unset all other defaults
      await supabase
        .from("payment_methods")
        .update({ is_default: false })
        .eq("user_id", user.id);
    }

    const { data: method, error } = await supabase
      .from("payment_methods")
      .update({ is_default, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ method });
  } catch (error) {
    console.error("Update payment method error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
