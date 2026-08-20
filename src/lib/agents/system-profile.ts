import { createAdminClient } from "@/lib/supabase/admin";

const CONTENT_AGENT_FULL_NAME = "Sanatix Content Agent";
const CONTENT_AGENT_EMAIL = "content-agent@sanatix.net";
const CONFIG_KEY = "content_agent_profile_id";

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
 *
 * Resolution order, each step only run if the previous one came up empty:
 *   1. agent_config.content_agent_profile_id — the fast path, and the
 *      only thing later runs should ever need (see migration 004; this
 *      exists specifically because step 2 below proved unreliable in
 *      practice — the first live run created the account but a
 *      name-based search failed to find it again afterwards, since the
 *      Postgres trigger that copies auth metadata into `profiles` isn't
 *      committed to version control and its exact behavior wasn't
 *      actually verified before shipping).
 *   2. profiles.full_name match — covers an account created before this
 *      config-table fix existed.
 *   3. Scan auth.users for a matching email via the admin API — covers
 *      an orphaned auth.users row with no discoverable profile match at
 *      all (exactly what happened on the first run). Sanatix has a
 *      small user base, so a full scan is cheap; if that ever stops
 *      being true, switch to a server-side email filter instead.
 *   4. Create a brand new account — only reached if none of the above
 *      found anything.
 * Whatever id is found or created gets written back to agent_config so
 * every future run takes the step-1 fast path and never re-runs 2-4.
 */
export async function getOrCreateContentAgentProfileId(): Promise<string> {
  const supabase = createAdminClient();

  // 1. Fast path — the only step normal runs should need.
  const { data: config } = await supabase
    .from("agent_config")
    .select("value")
    .eq("key", CONFIG_KEY)
    .maybeSingle();

  if (config?.value) {
    return config.value as string;
  }

  // 2. Fall back to a name-based search, in case the account was
  // created before agent_config existed.
  const { data: existingProfile, error: lookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("full_name", CONTENT_AGENT_FULL_NAME)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Failed to look up content agent profile: ${lookupError.message}`);
  }
  if (existingProfile) {
    await saveConfig(supabase, existingProfile.id as string);
    return existingProfile.id as string;
  }

  // 3. Try to create it. If Supabase says the email's already taken,
  // that means an orphaned auth.users row exists with no profile our
  // name-based search could find — scan for it directly instead of
  // failing outright.
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: CONTENT_AGENT_EMAIL,
    email_confirm: true,
    password: crypto.randomUUID(), // never used to sign in — this account has no login flow
    user_metadata: { full_name: CONTENT_AGENT_FULL_NAME },
  });

  let profileId: string;

  if (createError || !created?.user) {
    const alreadyExists = /already.*registered|already.*exists/i.test(createError?.message ?? "");
    if (!alreadyExists) {
      throw new Error(`Failed to create content agent system account: ${createError?.message}`);
    }

    const foundId = await findUserIdByEmail(supabase, CONTENT_AGENT_EMAIL);
    if (!foundId) {
      throw new Error(
        `Content agent account creation failed because "${CONTENT_AGENT_EMAIL}" is already registered, ` +
        `but scanning auth.users for that email found no match either. This needs a human to check the ` +
        `Supabase Auth dashboard directly and, once the account's User UID is found, seed it with: ` +
        `insert into agent_config (key, value) values ('${CONFIG_KEY}', '<uid>') on conflict (key) do update set value = excluded.value;`
      );
    }
    profileId = foundId;
  } else {
    profileId = created.user.id;
  }

  // `handle_new_user()` (schema.sql) is assumed to auto-insert a
  // profiles row on auth.users insert, defaulting role to 'customer' —
  // bump it to 'organizer' so this account behaves consistently
  // anywhere the app branches on role. Non-fatal if this fails (e.g.
  // the profiles row doesn't exist yet for some reason) — the account
  // still works as an organizer_id/owner_id target either way.
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: "organizer", country: "SA" })
    .eq("id", profileId);

  if (updateError) {
    console.error("[system-profile] resolved content agent account but failed to set role:", updateError);
  }

  await saveConfig(supabase, profileId);
  return profileId;
}

async function findUserIdByEmail(
  supabase: ReturnType<typeof createAdminClient>,
  email: string
): Promise<string | null> {
  // Sanatix has a very small user base at this stage (see 04-Database.md)
  // so a full paginated scan is cheap. Revisit if that ever changes.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      console.error("[system-profile] listUsers failed during email scan:", error);
      return null;
    }
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match.id;
    if (data.users.length < 200) break; // last page
  }
  return null;
}

async function saveConfig(supabase: ReturnType<typeof createAdminClient>, profileId: string) {
  const { error } = await supabase
    .from("agent_config")
    .upsert({ key: CONFIG_KEY, value: profileId, updated_at: new Date().toISOString() });
  if (error) {
    // Non-fatal — worst case, the next run repeats steps 2-3 instead of
    // taking the fast path. Still correct, just slightly slower.
    console.error("[system-profile] failed to cache content agent profile id:", error);
  }
}
