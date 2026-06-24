import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import Navbar from "@/components/layout/Navbar";
import PaymentHistory from "@/components/payments/PaymentHistory";
import SavedPaymentMethods from "@/components/payments/SavedPaymentMethods";
import { Link } from "@/i18n/routing";
import { ArrowLeft } from "lucide-react";

export default async function PaymentHistoryPage() {
  const locale = await getLocale();
  const supabase = await createClient();
  const isRTL = locale === "ar";

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  return (
    <div className="min-h-screen bg-brand-warm-white">
      <Navbar />

      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/dashboard"
            className="w-9 h-9 rounded-xl border border-black/8 flex items-center justify-center text-brand-ink/60 hover:bg-brand-sand transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-medium text-brand-midnight">
              {isRTL ? "المدفوعات" : "Payments"}
            </h1>
            <p className="text-sm text-brand-ink/45 mt-0.5">
              {isRTL
                ? "سجل معاملاتك وطرق الدفع المحفوظة"
                : "Your transaction history and saved payment methods"}
            </p>
          </div>
        </div>

        {/* Saved payment methods */}
        <div className="mb-10">
          <SavedPaymentMethods />
        </div>

        {/* Transaction history */}
        <div>
          <h2 className="text-base font-medium text-brand-midnight mb-5">
            {isRTL ? "سجل المعاملات" : "Transaction history"}
          </h2>
          <PaymentHistory />
        </div>
      </div>
    </div>
  );
}
