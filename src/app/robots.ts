import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/en/dashboard",
          "/organizer",
          "/en/organizer",
          "/admin",
          "/en/admin",
          "/bookings",
          "/en/bookings",
          "/favorites",
          "/en/favorites",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
