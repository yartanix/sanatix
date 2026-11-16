import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

export default async function NotFound() {
  const t = await getTranslations();
  return (
    <main className="min-h-[70vh] flex items-center justify-center bg-brand-warm-white px-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold text-brand-gold mb-2" aria-hidden="true">404</p>
        <h1 className="text-2xl font-medium text-brand-midnight mb-2">{t("common.notFoundTitle")}</h1>
        <p className="text-sm text-brand-ink/70 mb-6">{t("common.notFoundBody")}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="bg-brand-midnight text-brand-warm-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-brand-ink transition-colors"
          >
            {t("common.goHome")}
          </Link>
          <Link
            href="/events"
            className="px-5 py-2.5 rounded-xl font-medium text-sm text-brand-ink border border-black/10 hover:bg-brand-sand transition-colors"
          >
            {t("common.browseEvents")}
          </Link>
        </div>
      </div>
    </main>
  );
}
