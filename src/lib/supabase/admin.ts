import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses Row Level Security entirely.
 *
 * This is the FIRST thing in the codebase to actually use
 * SUPABASE_SERVICE_ROLE_KEY (see 01-Architecture-and-Setup.md — until
 * background agents existed, nothing in the app used it and every route
 * ran as the logged-in user, subject to RLS).
 *
 * Only ever call this from trusted server-side code that isn't acting on
 * behalf of a specific request-bound user — background agents (cron
 * routes), not user-facing API routes. A user-facing route that needs
 * elevated privileges should almost always be re-examined instead of
 * reached for this client, since it bypasses the RLS policies that are
 * this app's actual authorization boundary (see 03-Backend-API.md).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "createAdminClient() requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
