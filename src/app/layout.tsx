import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppChrome } from "@/components/shell/AppChrome";
import { ViewerProvider } from "@/components/shell/ViewerContext";
import { getViewer } from "@/services/viewer";
import type { Locale } from "@/i18n/config";
import { ServiceWorker } from "@/components/shell/ServiceWorker";

export const metadata: Metadata = {
  title: { default: "Game Museum", template: "%s · Game Museum" },
  description: "Every game you own deserves a place. A 3D museum for your Xbox, PlayStation and PC collection.",
  applicationName: "Game Museum",
  appleWebApp: { capable: true, title: "Game Museum", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#080A0E",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const viewer = await getViewer(locale);
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <ViewerProvider viewer={viewer}>
              <AppChrome>{children}</AppChrome>
            </ViewerProvider>
          </Providers>
        </NextIntlClientProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
