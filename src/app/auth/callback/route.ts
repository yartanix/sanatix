// Supabase sends people back to /auth/callback after Google sign-in, an
// email-confirmation link or a password-reset link (see the redirectTo /
// emailRedirectTo values in the auth pages). The handler itself lives at
// /api/auth/callback; without this file the documented /auth/callback URL
// had no route behind it and every one of those links landed on a 404.
export { GET } from "@/app/api/auth/callback/route";
