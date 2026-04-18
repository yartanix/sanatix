import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    // Match all pathnames except for static files, api routes, _next
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
