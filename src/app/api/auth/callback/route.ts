import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Security audit hardening: `next` already can't send a user off-site
// today, since it's appended after `origin` rather than parsed as its
// own URL — a value like "//evil.com" or "https://evil.com" lands as a
// same-origin path, not a protocol-relative/absolute redirect. This
// allowlist (must start with exactly one "/", never "//" or "/\") is
// defense-in-depth so that stays true even if this ever gets refactored
// to build the redirect differently, and rules out any browser that
// treats a leading backslash as a slash.
function sanitizeNextPath(value: string | null): string {
  if (value && /^\/(?!\/|\\)/.test(value)) return value;
  return "/ar/dashboard";
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/ar/login?error=auth_callback_failed`);
}
