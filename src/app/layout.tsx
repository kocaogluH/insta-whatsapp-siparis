import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#3c302a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://insta-whatsapp-siparis.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'InstaSipariş | Instagram & WhatsApp Sipariş Kataloğu',
    template: '%s | InstaSipariş',
  },
  description:
    'Instagram butikleri ve dükkanlar için bio sipariş kataloğu, WhatsApp/DM sepeti ve anlık stok yönetim sistemi.',
  applicationName: 'InstaSipariş',
  authors: [{ name: 'InstaSipariş' }],
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: baseUrl,
    siteName: 'InstaSipariş',
    title: 'InstaSipariş | Instagram & WhatsApp Sipariş Kataloğu',
    description:
      'Instagram butikleri ve dükkanlar için bio sipariş kataloğu, WhatsApp/DM sepeti ve anlık stok yönetim sistemi.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'InstaSipariş | Instagram & WhatsApp Sipariş Kataloğu',
    description:
      'Instagram butikleri ve dükkanlar için bio sipariş kataloğu, WhatsApp/DM sepeti ve anlık stok yönetim sistemi.',
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
        <meta name="apple-mobile-web-app-title" content="InstaSipariş" />
      </head>
      <body className="min-h-screen bg-[#f7f4ee] text-[#33261f] antialiased selection:bg-[#ded4c3] selection:text-[#312925]">
        {children}
      </body>
    </html>
  );
}
