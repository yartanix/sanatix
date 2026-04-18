import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Sanatix — Light up your moments",
  description: "The GCC's event marketplace. Discover events, book tickets, and find event vendors.",
  icons: {
    icon: "/icons/favicon.ico",
  },
  openGraph: {
    title: "Sanatix",
    description: "Light up your moments — أضئ لحظاتك",
    url: "https://sanatix.net",
    siteName: "Sanatix",
    locale: "ar_SA",
    alternateLocale: "en_US",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-brand-warm-white text-brand-midnight antialiased">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
