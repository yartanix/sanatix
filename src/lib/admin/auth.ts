import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export type AdminRole = "super_admin" | "moderator" | "analyst";

export interface AdminUser {
  id: string;
  email: string | undefined;
  role: string;
  adminRoles: AdminRole[];
}

/**
 * Verify the current request is from an authenticated admin.
 * Returns { admin } on success or a NextResponse error on failure.
 */
export async function requireAdmin(
  requiredRole?: AdminRole
): Promise<{ admin: AdminUser } | { error: NextResponse }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const { data: adminRolesData } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id);

  const adminRoles: AdminRole[] =
    adminRolesData?.map((r) => r.role as AdminRole) ?? [];

  if (requiredRole && !adminRoles.includes(requiredRole)) {
    return {
      error: NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      ),
    };
  }

  return {
    admin: {
      id: user.id,
      email: user.email,
      role: profile.role,
      adminRoles,
    },
  };
}

/**
 * Log an admin action to the activity_logs table.
 */
export async function logAdminAction(params: {
  adminId: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
}) {
  const supabase = await createClient();
  await supabase.from("activity_logs").insert({
    admin_id: params.adminId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    changes: params.changes ?? null,
    ip_address: params.ipAddress ?? null,
  });
}
