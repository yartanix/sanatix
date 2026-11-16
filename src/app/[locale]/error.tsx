"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

// Catches an error thrown while rendering any page under /[locale] (a
// failed query, a bad response) and offers a retry instead of Next's bare
// "Application error" screen.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations();

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="min-h-[70vh] flex items-center justify-center bg-brand-warm-white px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-medium text-brand-midnight mb-2">{t("common.errorTitle")}</h1>
        <p className="text-sm text-brand-ink/70 mb-6">{t("common.errorBody")}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="bg-brand-midnight text-brand-warm-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-brand-ink transition-colors"
          >
            {t("common.tryAgain")}
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl font-medium text-sm text-brand-ink border border-black/10 hover:bg-brand-sand transition-colors"
          >
            {t("common.goHome")}
          </Link>
        </div>
      </div>
    </main>
  );
}
