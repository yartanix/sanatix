import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import { LargeSecureStore } from "./secure-session-store";

// Same Supabase project as the web app — RLS policies (migration 011)
// are the shared authorization boundary for both, so a host's session
// here works exactly like a session on sanatix.net.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — copy .env.example to .env and fill them in."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Security audit fix: was plain AsyncStorage, which is unencrypted
    // on both platforms — see secure-session-store.ts for the full
    // reasoning. The session (a long-lived refresh token included) is
    // the single most sensitive thing this app persists on the
    // device.
    storage: new LargeSecureStore(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL ?? "https://sanatix.net";
