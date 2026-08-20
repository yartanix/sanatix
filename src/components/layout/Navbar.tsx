"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter, usePathname } from "@/i18n/routing";
import { Menu, X, Globe, LayoutDashboard, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function Navbar() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const isRTL = locale === "ar";

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
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
    <nav className="sticky top-0 z-50 bg-brand-midnight/80 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <svg width="28" height="28" viewBox="0 0 34 34" fill="none">
            <defs>
              <filter id="navGlow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="1.4" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <g filter="url(#navGlow)">
              <circle cx="6"  cy="28" r="3"   fill="#C8973A" opacity="0.5"/>
              <circle cx="16" cy="18" r="4.5" fill="#C8973A" opacity="0.78"/>
              <circle cx="28" cy="6"  r="6"   fill="#C8973A"/>
              <circle cx="28" cy="6"  r="10"  stroke="#C8973A" strokeWidth="0.75" opacity="0.3" strokeDasharray="2.5 2"/>
              <line x1="9"  y1="26" x2="13" y2="21" stroke="#C8973A" strokeWidth="0.85" opacity="0.5"/>
              <line x1="19" y1="15" x2="23" y2="10" stroke="#C8973A" strokeWidth="0.85" opacity="0.5"/>
            </g>
          </svg>
          <span className="text-lg font-medium tracking-tight text-brand-warm-white">sanatix</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-7 text-sm text-brand-warm-white/65">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-brand-warm-white transition-colors">
              {l.label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={toggleLocale}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-warm-white/70 hover:text-brand-warm-white transition-colors border border-white/15 rounded-full px-3 py-1.5"
          >
            <Globe size={13} />
            {isRTL ? "EN" : "ع"}
          </button>
          {user ? (
            <>
              <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-brand-warm-white/75 hover:text-brand-warm-white transition-colors">
                <LayoutDashboard size={15} />
                {isRTL ? "لوحتي" : "Dashboard"}
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm text-brand-warm-white/75 hover:text-brand-warm-white transition-colors"
              >
                <LogOut size={15} />
                {t("common.logout")}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-brand-warm-white/75 hover:text-brand-warm-white transition-colors">
                {t("common.login")}
              </Link>
              <Link
                href="/register"
                className="text-sm font-semibold text-brand-midnight px-4 py-2 rounded-full bg-gradient-to-br from-brand-gold-light to-brand-gold hover:opacity-90 transition-opacity shadow-[0_8px_24px_-8px_rgba(200,151,58,0.55)]"
              >
                {t("common.register")}
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-brand-warm-white"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-brand-midnight border-t border-white/[0.08] px-6 py-4 space-y-4">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block text-sm text-brand-warm-white/75 hover:text-brand-warm-white"
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-2 flex items-center gap-3 border-t border-white/[0.08]">
            {user ? (
              <>
                <Link href="/dashboard" className="text-sm text-brand-warm-white/75" onClick={() => setMenuOpen(false)}>
                  {isRTL ? "لوحتي" : "Dashboard"}
                </Link>
                <button
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  className="text-sm font-semibold text-brand-midnight px-4 py-2 rounded-full bg-gradient-to-br from-brand-gold-light to-brand-gold"
                >
                  {t("common.logout")}
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm text-brand-warm-white/75" onClick={() => setMenuOpen(false)}>{t("common.login")}</Link>
                <Link href="/register" className="text-sm font-semibold text-brand-midnight px-4 py-2 rounded-full bg-gradient-to-br from-brand-gold-light to-brand-gold" onClick={() => setMenuOpen(false)}>
                  {t("common.register")}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
