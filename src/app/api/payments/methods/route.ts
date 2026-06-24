import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { PaymentMethodType } from "@/types/payments";

// GET /api/payments/methods — list saved payment methods
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: methods, error } = await supabase
      .from("payment_methods")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ methods: methods || [] });
  } catch (error) {
    console.error("Get payment methods error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/payments/methods — save a new payment method
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      type,
      provider,
      token,
      last_four,
      expiry_month,
      expiry_year,
      is_default = false,
    } = body as {
      type: PaymentMethodType;
      provider: string;
      token?: string;
      last_four?: string;
      expiry_month?: number;
      expiry_year?: number;
      is_default?: boolean;
    };

    if (!type || !provider) {
      return NextResponse.json(
        { error: "type and provider are required" },
        { status: 400 }
      );
    }

    // If setting as default, unset all other defaults first
    if (is_default) {
      await supabase
        .from("payment_methods")
        .update({ is_default: false })
        .eq("user_id", user.id);
    }

    const { data: method, error } = await supabase
      .from("payment_methods")
      .insert({
        user_id: user.id,
        type,
        provider,
        token,
        last_four,
        expiry_month,
        expiry_year,
        is_default,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ method }, { status: 201 });
  } catch (error) {
    console.error("Save payment method error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
