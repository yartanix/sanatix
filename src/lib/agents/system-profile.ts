import { createAdminClient } from "@/lib/supabase/admin";

const CONTENT_AGENT_FULL_NAME = "Sanatix Content Agent";
const CONTENT_AGENT_EMAIL = "content-agent@sanatix.net";

/**
 * `events.organizer_id` and `vendors.owner_id` are NOT NULL foreign keys
 * into `profiles`, which is itself a 1:1 extension of Supabase's
 * `auth.users` table (see 04-Database.md) — there's no way to insert an
 * event or vendor without a real, existing profile to attribute it to.
 *
 * Rather than picking a random real user (wrong, and creepy) or altering
 * the schema to make these columns nullable (invasive, touches every
 * query that joins/displays organizer info), this creates one real,
 * clearly-labeled system account — "Sanatix Content Agent" — the first
 * time the content agent runs, and reuses it on every subsequent run.
 * Every agent-authored event/vendor is attributed to this account, which
 * combined with `agent_generated = true` (see migration 003) makes
 * agent content fully distinguishable from real organizer/vendor
 * submissions everywhere it's displayed or queried.
 */
export async function getOrCreateContentAgentProfileId(): Promise<string> {
  const supabase = createAdminClient();

  const { data: existing, error: lookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("full_name", CONTENT_AGENT_FULL_NAME)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Failed to look up content agent profile: ${lookupError.message}`);
  }
  if (existing) {
    return existing.id as string;
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: CONTENT_AGENT_EMAIL,
    email_confirm: true,
    password: crypto.randomUUID(), // never used to sign in — this account has no login flow
    user_metadata: { full_name: CONTENT_AGENT_FULL_NAME },
  });

  if (createError || !created?.user) {
    throw new Error(`Failed to create content agent system account: ${createError?.message}`);
  }

  // `handle_new_user()` (schema.sql) auto-inserts a profiles row with
  // full_name/avatar_url on auth.users insert, defaulting role to
  // 'customer' — bump it to 'organizer' so this account behaves
  // consistently anywhere the app branches on role.
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: "organizer", country: "SA" })
    .eq("id", created.user.id);

  if (updateError) {
    // Non-fatal — the account still works as an organizer_id/owner_id
    // target even if the role field itself didn't get set.
    console.error("[system-profile] created content agent account but failed to set role:", updateError);
  }

  return created.user.id;
}
