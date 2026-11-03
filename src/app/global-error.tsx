"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

// Next.js only renders this when an error escapes every nested error.tsx
// boundary — i.e. something broke badly enough to take down the root
// layout itself. Reporting it here means we still hear about the worst
// failures, not just the ones a page-level boundary already caught.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        {/* statusCode={0} because the App Router doesn't expose one here —
            NextError falls back to its generic "something went wrong" copy. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
