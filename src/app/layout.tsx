import type { Metadata, Viewport } from 'next';
import { SITE_NAME, SITE_DESCRIPTION, BASE_URL } from '@/lib/constants';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#3c302a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: `${SITE_NAME} | Instagram & WhatsApp Sipariş Kataloğu`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: BASE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | Instagram & WhatsApp Sipariş Kataloğu`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} | Instagram & WhatsApp Sipariş Kataloğu`,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={SITE_NAME} />
      </head>
      <body className="min-h-screen bg-[#f7f4ee] text-[#33261f] antialiased selection:bg-[#ded4c3] selection:text-[#312925]">
        {children}
      </body>
    </html>
  );
}
