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

type Role = "customer" | "organizer" | "supplier";

const roles: { value: Role; labelKey: string; descKey: string; icon: string }[] = [
  { value: "customer",  labelKey: "auth.roleCustomer",  descKey: "auth.roleCustomerDesc",  icon: "🎟️" },
  { value: "organizer", labelKey: "auth.roleOrganizer", descKey: "auth.roleOrganizerDesc", icon: "🎪" },
  { value: "supplier",  labelKey: "auth.roleSupplier",  descKey: "auth.roleSupplierDesc",  icon: "🏪" },
];

export default function RegisterPage() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const next = searchParams.get("next");
  const redirectTo = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<Role>("customer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone, role },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (next && redirectTo !== "/dashboard") {
      window.location.assign(redirectTo);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <AuthShell title={t("auth.registerTitle")}>
      {/* Step 1: Choose role */}
      {step === 1 && (
        <div>
          <fieldset className="mb-6">
            <legend className="text-sm text-brand-ink/70 mb-5 text-center w-full">{t("auth.joiningAs")}</legend>
            <div className="space-y-3">
              {roles.map((r) => (
                <label
                  key={r.value}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border text-start transition-colors cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-gold ${
                    role === r.value ? "border-brand-gold bg-brand-gold/5" : "border-black/10 hover:border-black/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={() => setRole(r.value)}
                    className="sr-only"
                  />
                  <span className="text-2xl" aria-hidden="true">{r.icon}</span>
                  <span>
                    <span className="block text-sm font-medium text-brand-midnight">{t(r.labelKey)}</span>
                    <span className="block text-xs text-brand-ink/60">{t(r.descKey)}</span>
                  </span>
                  {role === r.value && (
                    <span aria-hidden="true" className="ms-auto w-4 h-4 rounded-full bg-brand-gold flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    </span>
                  )}
                </label>
              ))}
            </div>
          </fieldset>

          <button type="button" onClick={() => setStep(2)} className={authSubmitClass}>
            {t("common.next")} <span aria-hidden="true" className="inline-block rtl:rotate-180">→</span>
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-black/5" />
            <span className="text-xs text-brand-ink/60">{t("auth.orContinueWith")}</span>
            <div className="flex-1 h-px bg-black/5" />
          </div>
          <GoogleButton />
        </div>
      )}

      {/* Step 2: Fill details */}
      {step === 2 && (
        <form onSubmit={handleRegister} className="space-y-4">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="text-sm text-brand-ink/60 hover:text-brand-ink mb-2 flex items-center gap-1"
          >
            <span aria-hidden="true" className="inline-block rtl:rotate-180">←</span> {t("common.back")}
          </button>

          <FormStatus message={error} />

          <div>
            <label htmlFor="name" className={authLabelClass}>{t("auth.fullName")}</label>
            <input
              id="name"
              name="name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              enterKeyHint="next"
              required
              className={authInputClass}
            />
          </div>

          <div>
            <label htmlFor="email" className={authLabelClass}>{t("auth.email")}</label>
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
            <label htmlFor="tel" className={authLabelClass}>{t("auth.phone")}</label>
            {/* dir="ltr": a phone number reads left-to-right in Arabic too. */}
            <input
              id="tel"
              name="tel"
              type="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              enterKeyHint="next"
              placeholder="+966 5x xxx xxxx"
              className={`${authInputClass} rtl:text-end`}
            />
          </div>

          <PasswordField
            id="new-password"
            label={t("auth.password")}
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            minLength={8}
            hint={t("auth.passwordHint")}
          />

          <button type="submit" disabled={loading} className={`${authSubmitClass} mt-2`}>
            {loading ? t("common.loading") : t("common.register")}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-brand-ink/60 mt-5">
        {t("auth.alreadyHaveAccount")}{" "}
        <Link
          href={next ? { pathname: "/login", query: { next } } : "/login"}
          className="text-brand-gold hover:underline font-medium"
        >
          {t("common.login")}
        </Link>
      </p>
    </AuthShell>
  );
}
