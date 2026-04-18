"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff } from "lucide-react";

type Role = "customer" | "organizer" | "supplier";

const roles: { value: Role; labelKey: string; icon: string }[] = [
  { value: "customer",  labelKey: "role.customer",  icon: "🎟️" },
  { value: "organizer", labelKey: "role.organizer",  icon: "🎪" },
  { value: "supplier",  labelKey: "role.supplier",   icon: "🏪" },
];

export default function RegisterPage() {
  const t = useTranslations();
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<Role>("customer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

    router.push("/dashboard");
  }

  async function handleGoogleRegister() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="min-h-screen bg-brand-warm-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 34 34" fill="none">
              <circle cx="6"  cy="28" r="3"   fill="#C8973A" opacity="0.45"/>
              <circle cx="16" cy="18" r="4.5" fill="#C8973A" opacity="0.72"/>
              <circle cx="28" cy="6"  r="6"   fill="#C8973A"/>
              <circle cx="28" cy="6"  r="10"  stroke="#C8973A" strokeWidth="0.75" opacity="0.22" strokeDasharray="2.5 2"/>
              <line x1="9"  y1="26" x2="13" y2="21" stroke="#C8973A" strokeWidth="0.85" opacity="0.42"/>
              <line x1="19" y1="15" x2="23" y2="10" stroke="#C8973A" strokeWidth="0.85" opacity="0.42"/>
            </svg>
            <span className="text-xl font-medium text-brand-midnight">sanatix</span>
          </Link>
          <h1 className="text-2xl font-medium text-brand-midnight mt-6 mb-1">
            {t("auth.registerTitle")}
          </h1>
        </div>

        <div className="bg-white rounded-2xl border border-black/5 p-8 shadow-sm">

          {/* Step 1: Choose role */}
          {step === 1 && (
            <div>
              <p className="text-sm text-brand-ink/60 mb-5 text-center">I am joining as a...</p>
              <div className="space-y-3 mb-6">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setRole(r.value)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border text-start transition-all ${
                      role === r.value
                        ? "border-brand-gold bg-brand-gold/5"
                        : "border-black/8 hover:border-black/15"
                    }`}
                  >
                    <span className="text-2xl">{r.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-brand-midnight capitalize">{r.value}</p>
                      <p className="text-xs text-brand-ink/50">
                        {r.value === "customer"  && "Discover and attend events"}
                        {r.value === "organizer" && "Create and manage events"}
                        {r.value === "supplier"  && "Offer services to events"}
                      </p>
                    </div>
                    {role === r.value && (
                      <div className="ms-auto w-4 h-4 rounded-full bg-brand-gold flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full bg-brand-midnight text-brand-warm-white py-3 rounded-xl font-medium text-sm hover:bg-brand-ink transition-colors"
              >
                {t("common.next")} →
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-black/5" />
                <span className="text-xs text-brand-ink/40">{t("auth.orContinueWith")}</span>
                <div className="flex-1 h-px bg-black/5" />
              </div>
              <button
                onClick={handleGoogleRegister}
                className="w-full flex items-center justify-center gap-3 border border-black/10 rounded-xl py-3 text-sm text-brand-ink hover:bg-brand-sand transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.174 0 7.548 0 9s.348 2.826.957 4.039l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z"/>
                </svg>
                Google
              </button>
            </div>
          )}

          {/* Step 2: Fill details */}
          {step === 2 && (
            <form onSubmit={handleRegister} className="space-y-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-brand-ink/50 hover:text-brand-ink mb-2 flex items-center gap-1"
              >
                ← {t("common.back")}
              </button>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-brand-ink mb-1.5">{t("auth.fullName")}</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-black/10 bg-brand-warm-white text-brand-midnight focus:outline-none focus:ring-2 focus:ring-brand-gold/30 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-ink mb-1.5">{t("auth.email")}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-black/10 bg-brand-warm-white text-brand-midnight focus:outline-none focus:ring-2 focus:ring-brand-gold/30 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-ink mb-1.5">{t("auth.phone")}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+966 5x xxx xxxx"
                  className="w-full px-4 py-3 rounded-xl border border-black/10 bg-brand-warm-white text-brand-midnight placeholder:text-brand-ink/30 focus:outline-none focus:ring-2 focus:ring-brand-gold/30 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-ink mb-1.5">{t("auth.password")}</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-3 pe-11 rounded-xl border border-black/10 bg-brand-warm-white text-brand-midnight focus:outline-none focus:ring-2 focus:ring-brand-gold/30 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-brand-ink/40 hover:text-brand-ink"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-midnight text-brand-warm-white py-3 rounded-xl font-medium text-sm hover:bg-brand-ink transition-colors disabled:opacity-50 mt-2"
              >
                {loading ? t("common.loading") : t("common.register")}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-brand-ink/50 mt-5">
            {t("auth.alreadyHaveAccount")}{" "}
            <Link href="/login" className="text-brand-gold hover:underline font-medium">
              {t("common.login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
