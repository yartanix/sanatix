"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import AuthShell, { authInputClass, authLabelClass, authSubmitClass } from "@/components/auth/AuthShell";
import FormStatus from "@/components/auth/FormStatus";

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const locale = useLocale();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // The emailed link comes back through /auth/callback, which signs the
    // person in and forwards them to the page where they pick a new password.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/${locale}/reset-password`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Same message whether or not the address has an account, so this form
    // can't be used to find out who is registered.
    setSent(true);
  }

  return (
    <AuthShell title={t("auth.forgotTitle")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-brand-ink/70">{t("auth.forgotBody")}</p>

        <FormStatus message={error} />
        <FormStatus message={sent ? t("auth.resetSent") : null} tone="success" />

        <div>
          <label htmlFor="email" className={authLabelClass}>
            {t("auth.email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            spellCheck={false}
            enterKeyHint="send"
            required
            className={authInputClass}
          />
        </div>

        <button type="submit" disabled={loading} className={authSubmitClass}>
          {loading ? t("common.loading") : t("auth.sendResetLink")}
        </button>
      </form>

      <p className="text-center text-sm mt-5">
        <Link href="/login" className="text-brand-gold hover:underline font-medium">
          {t("auth.backToLogin")}
        </Link>
      </p>
    </AuthShell>
  );
}
