"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import AuthShell, { authSubmitClass } from "@/components/auth/AuthShell";
import FormStatus from "@/components/auth/FormStatus";
import PasswordField from "@/components/auth/PasswordField";

// Reached from the emailed reset link, by way of /auth/callback, which has
// already exchanged the link's code for a session. Without that session
// there is nobody to set a password for, so the form is replaced by a
// pointer back to "forgot password".
export default function ResetPasswordPage() {
  const t = useTranslations();
  const router = useRouter();
  const supabase = createClient();

  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setHasSession(Boolean(data.user)));
    // Runs once on mount; the client is stable for the page's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/dashboard"), 1500);
  }

  return (
    <AuthShell title={t("auth.resetTitle")}>
      {hasSession === false ? (
        <div className="space-y-4">
          <FormStatus message={t("auth.resetLinkInvalid")} />
          <Link href="/forgot-password" className={`${authSubmitClass} block text-center`}>
            {t("auth.sendResetLink")}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormStatus message={error} />
          <FormStatus message={done ? t("auth.passwordUpdated") : null} tone="success" />

          <PasswordField
            id="new-password"
            label={t("auth.newPassword")}
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            minLength={8}
            hint={t("auth.passwordHint")}
          />

          <button type="submit" disabled={loading || done || hasSession === null} className={authSubmitClass}>
            {loading ? t("common.loading") : t("auth.updatePassword")}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
