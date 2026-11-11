import { useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import { supabase } from "./supabase";
import type { Profile } from "./types";

export type AccessStatus = "loading" | "signed-out" | "wrong-role" | "ok";

// Shared gate for every tab screen: resolves whether the viewer is
// signed in AND holds an allowed role, without ever redirecting away
// from the screen itself — the tab bar (and this screen's own chrome)
// stays visible the whole time; callers render <AccessGate/> in place
// of their real content when status !== "ok".
export function useAccessState(allowedRoles: string[]) {
  const { session, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    supabase
      .from("profiles")
      .select("id, full_name, phone, role")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        setProfile((data as Profile) ?? null);
        setProfileLoading(false);
      });
  }, [authLoading, session]);

  const status: AccessStatus =
    authLoading || profileLoading
      ? "loading"
      : !session
      ? "signed-out"
      : profile && !allowedRoles.includes(profile.role)
      ? "wrong-role"
      : "ok";

  return { status, profile, session };
}
