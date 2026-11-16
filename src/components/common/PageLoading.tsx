import { getTranslations } from "next-intl/server";

// Shown by the loading.tsx files of the signed-in areas (dashboards,
// bookings, parties, favorites) while a page fetches its data on the server.
// Before these existed a slow query left the previous page on screen with
// no sign that the tap had registered.
//
// Deliberately NOT used at the /[locale] root: a loading boundary makes Next
// send the response before the page has run, so a public page that calls
// notFound() (a deleted event, a mistyped URL) would answer with HTTP 200
// instead of 404. Public, indexable pages keep their real status codes.
export default async function PageLoading() {
  const t = await getTranslations();
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-brand-warm-white">
      <progress aria-label={t("common.loading")} className="loading-spinner" />
    </div>
  );
}
