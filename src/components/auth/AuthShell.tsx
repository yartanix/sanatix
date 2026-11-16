import type { ReactNode } from "react";
import { Link } from "@/i18n/routing";

// Shared frame for the sign-in, sign-up and password-reset screens: logo,
// page heading, and the white card the form sits in.
export default function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-brand-warm-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 34 34" fill="none" aria-hidden="true">
              <circle cx="6"  cy="28" r="3"   fill="#C8973A" opacity="0.45"/>
              <circle cx="16" cy="18" r="4.5" fill="#C8973A" opacity="0.72"/>
              <circle cx="28" cy="6"  r="6"   fill="#C8973A"/>
              <circle cx="28" cy="6"  r="10"  stroke="#C8973A" strokeWidth="0.75" opacity="0.22" strokeDasharray="2.5 2"/>
              <line x1="9"  y1="26" x2="13" y2="21" stroke="#C8973A" strokeWidth="0.85" opacity="0.42"/>
              <line x1="19" y1="15" x2="23" y2="10" stroke="#C8973A" strokeWidth="0.85" opacity="0.42"/>
            </svg>
            <span className="text-xl font-medium text-brand-midnight">sanatix</span>
          </Link>
          <h1 className="text-2xl font-medium text-brand-midnight mt-6 mb-1">{title}</h1>
        </div>
        <div className="bg-white rounded-2xl border border-black/5 p-8 shadow-sm">{children}</div>
      </div>
    </main>
  );
}

export const authInputClass =
  "w-full px-4 py-3 rounded-xl border border-black/10 bg-brand-warm-white text-brand-midnight placeholder:text-brand-ink/40 text-sm";

export const authLabelClass = "block text-sm font-medium text-brand-ink mb-1.5";

export const authSubmitClass =
  "w-full bg-brand-midnight text-brand-warm-white py-3 rounded-xl font-medium text-sm hover:bg-brand-ink transition-colors disabled:opacity-50";
