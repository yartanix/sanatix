"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import AuthShell, { authInputClass, authLabelClass, authSubmitClass } from "@/components/auth/AuthShell";
import FormStatus from "@/components/auth/FormStatus";
import GoogleButton from "@/components/auth/GoogleButton";
import PasswordField from "@/components/auth/PasswordField";

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Pages that require auth link here with ?next=/wherever-they-came-from
  // (see the (organizer) and (admin) layouts, and the crowdfunding pledge
  // form) — only honor an internal path, never an absolute URL, so this
  // can't be turned into an open redirect.
  const next = searchParams.get("next");
  const redirectTo = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  // /auth/callback sends people back here with ?error=auth_callback_failed
  // when a Google sign-in or emailed link couldn't be completed.
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "auth_callback_failed" ? t("auth.callbackFailed") : null,
  );

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // `next` (when present) already carries its own locale prefix, e.g.
    // "/en/organizer" — a plain navigation, not the locale-aware router
    // (which would add its own prefix on top and double it up).
    if (next && redirectTo !== "/dashboard") {
      window.location.assign(redirectTo);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <AuthShell title={t("auth.loginTitle")}>
      <form onSubmit={handleLogin} className="space-y-4">
        <FormStatus message={error} />

        <div>
          <label htmlFor="email" className={authLabelClass}>
            {t("auth.email")}
          </label>
          {/* autocomplete="username" (not "email") is what password
              managers key a saved sign-in on. */}
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            spellCheck={false}
            enterKeyHint="next"
            required
            className={authInputClass}
          />
        </div>

        <div>
          <PasswordField
            id="current-password"
            label={t("auth.password")}
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
          <div className="text-end mt-1.5">
            <Link href="/forgot-password" className="text-xs text-brand-gold hover:underline">
              {t("auth.forgotPassword")}
            </Link>
          </div>
        </div>

        <button type="submit" disabled={loading} className={authSubmitClass}>
          {loading ? t("common.loading") : t("common.login")}
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-black/5" />
        <span className="text-xs text-brand-ink/60">{t("auth.orContinueWith")}</span>
        <div className="flex-1 h-px bg-black/5" />
      </div>

      <GoogleButton />

      <p className="text-center text-sm text-brand-ink/60 mt-5">
        {t("auth.noAccount")}{" "}
        <Link
          href={next ? { pathname: "/register", query: { next } } : "/register"}
          className="text-brand-gold hover:underline font-medium"
        >
          {t("common.register")}
        </Link>
      </p>
    </AuthShell>
  );
}
