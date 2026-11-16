import { notFound } from "next/navigation";

// Any URL under /[locale] that no other route matches lands here, so it is
// answered by the localized not-found page (./not-found.tsx) with the right
// language and direction, rather than Next's default English 404.
export default function CatchAllPage() {
  notFound();
}
