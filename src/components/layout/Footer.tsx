"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";

export default function Footer() {
  const locale = useLocale();
  const isRTL = locale === "ar";
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-brand-sand bg-brand-warm-white mt-16">
      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-brand-ink/50">
          © {year} Sanatix. {isRTL ? "جميع الحقوق محفوظة." : "All rights reserved."}
        </p>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/" className="text-brand-ink/60 hover:text-brand-gold transition-colors">
            {isRTL ? "الرئيسية" : "Home"}
          </Link>
          <Link href="/support" className="text-brand-ink/60 hover:text-brand-gold transition-colors">
            {isRTL ? "الدعم" : "Support"}
          </Link>
          <Link href="/privacy" className="text-brand-ink/60 hover:text-brand-gold transition-colors">
            {isRTL ? "سياسة الخصوصية" : "Privacy Policy"}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
