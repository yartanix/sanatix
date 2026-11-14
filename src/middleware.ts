import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    // Match all pathnames except for static files, api routes, _next —
    // and the locale-less /auth/* route handlers (callback, signout).
    // Those live outside [locale]; when the i18n middleware ran on them it
    // rewrote /auth/signout to /ar/auth/signout, which doesn't exist, so
    // sign-out and the OAuth/email callback both returned 404.
    "/((?!api|auth/|_next|_vercel|.*\\..*).*)",
  ],
};
