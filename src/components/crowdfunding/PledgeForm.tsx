"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { Heart, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

const PRESET_AMOUNTS = [100, 250, 500, 1000];

export default function PledgeForm({
  campaignId,
  currency,
  isRTL,
}: {
  campaignId: string;
  currency: string;
  isRTL: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [amount, setAmount] = useState<number | "">(250);
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setCheckingAuth(false);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setError(isRTL ? "أدخل مبلغًا صحيحًا" : "Enter a valid amount");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/campaigns/${campaignId}/contributions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, is_anonymous: anonymous }),
    });
    const result = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(result.error ?? (isRTL ? "حدث خطأ" : "Something went wrong"));
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (checkingAuth) return null;

  if (done) {
    return (
      <div className="bg-white rounded-2xl border border-black/5 p-5 text-center">
        <Heart size={24} className="text-brand-gold mx-auto mb-2 fill-brand-gold" />
        <p className="text-sm font-medium text-brand-midnight">
          {isRTL ? "شكرًا على دعمك!" : "Thanks for backing this!"}
        </p>
        <p className="text-xs text-brand-ink/50 mt-1">
          {isRTL ? "تم تسجيل مساهمتك." : "Your pledge has been recorded."}
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white rounded-2xl border border-black/5 p-5 text-center">
        <p className="text-sm text-brand-ink/60 mb-3">
          {isRTL ? "سجّل الدخول لدعم هذه الحملة" : "Sign in to back this campaign"}
        </p>
        <a
          href={`/login?next=${encodeURIComponent(pathname)}`}
          className="inline-block px-5 py-2.5 rounded-xl bg-brand-midnight text-white text-sm font-medium hover:bg-brand-ink transition-colors"
        >
          {isRTL ? "تسجيل الدخول" : "Sign in"}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-black/5 p-5 space-y-4">
      <h2 className="text-sm font-medium text-brand-midnight">
        {isRTL ? "ادعم هذه الحملة" : "Back this campaign"}
      </h2>

      <div className="grid grid-cols-4 gap-2">
        {PRESET_AMOUNTS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setAmount(preset)}
            className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
              amount === preset
                ? "bg-brand-midnight text-white border-brand-midnight"
                : "bg-white text-brand-ink/65 border-black/10 hover:border-brand-gold/50"
            }`}
          >
            {formatCurrency(preset, currency, isRTL ? "ar-SA" : "en-US")}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-xs text-brand-ink/50 mb-1.5">
          {isRTL ? "أو أدخل مبلغًا آخر" : "Or enter a custom amount"}
        </label>
        <input
          type="number"
          min={1}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
          className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm text-brand-midnight focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-brand-ink/60">
        <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="rounded" />
        {isRTL ? "ساهم بشكل مجهول" : "Contribute anonymously"}
      </label>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-brand-gold text-white text-sm font-medium hover:bg-brand-gold/90 transition-colors disabled:opacity-50"
      >
        {loading ? (isRTL ? "..." : "...") : isRTL ? "ساهم الآن" : "Pledge now"}
      </button>

      <p className="flex items-start gap-1.5 text-[11px] text-brand-ink/40 leading-relaxed">
        <Info size={12} className="shrink-0 mt-0.5" />
        {isRTL
          ? "معالجة الدفع غير مفعّلة بعد — سيتم تسجيل مساهمتك هنا لكن لن يتم خصم أي مبلغ من حسابك."
          : "Payment processing isn't live yet — your pledge is recorded here, but no money is actually charged."}
      </p>
    </form>
  );
}
