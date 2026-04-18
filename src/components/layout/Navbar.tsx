"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter, usePathname } from "@/i18n/routing";
import { Menu, X, Globe } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isRTL = locale === "ar";

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  function toggleLocale() {
    router.replace(pathname, { locale: locale === "ar" ? "en" : "ar" });
  }

  const navLinks = [
    { href: "/events",       label: t("nav.events") },
    { href: "/vendors",      label: t("nav.vendors") },
    { href: "/organizers",   label: t("nav.organizers") },
    { href: "/crowdfunding", label: t("nav.crowdfunding") },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-brand-warm-white/90 backdrop-blur border-b border-black/5">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <svg width="30" height="30" viewBox="0 0 34 34" fill="none">
            <circle cx="6"  cy="28" r="3"   fill="#C8973A" opacity="0.45"/>
            <circle cx="16" cy="18" r="4.5" fill="#C8973A" opacity="0.72"/>
            <circle cx="28" cy="6"  r="6"   fill="#C8973A"/>
            <circle cx="28" cy="6"  r="10"  stroke="#C8973A" strokeWidth="0.75" opacity="0.22" strokeDasharray="2.5 2"/>
            <line x1="9"  y1="26" x2="13" y2="21" stroke="#C8973A" strokeWidth="0.85" opacity="0.42"/>
            <line x1="19" y1="15" x2="23" y2="10" stroke="#C8973A" strokeWidth="0.85" opacity="0.42"/>
          </svg>
          <span className="text-lg font-medium tracking-tight text-brand-midnight">sanatix</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-7 text-sm text-brand-ink/65">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-brand-midnight transition-colors">
              {l.label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={toggleLocale}
            className="flex items-center gap-1.5 text-sm text-brand-ink/60 hover:text-brand-midnight transition-colors"
          >
            <Globe size={15} />
            {isRTL ? "EN" : "ع"}
          </button>
          <Link href="/login" className="text-sm text-brand-ink/70 hover:text-brand-midnight transition-colors">
            {t("common.login")}
          </Link>
          <Link
            href="/register"
            className="text-sm bg-brand-gold text-white px-4 py-2 rounded-full hover:bg-brand-gold/90 transition-colors font-medium"
          >
            {t("common.register")}
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-brand-ink"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-brand-warm-white border-t border-black/5 px-6 py-4 space-y-4">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block text-sm text-brand-ink/70 hover:text-brand-midnight"
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-2 flex items-center gap-3 border-t border-black/5">
            <Link href="/login" className="text-sm text-brand-ink/70">{t("common.login")}</Link>
            <Link href="/register" className="text-sm bg-brand-gold text-white px-4 py-2 rounded-full font-medium">
              {t("common.register")}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
