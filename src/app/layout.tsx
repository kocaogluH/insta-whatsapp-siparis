import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'InstaSipariş | Instagram & WhatsApp Sipariş ve Hibrit Stok Sistemi',
  description: 'Instagram butikleri ve fiziksel mağazalar için katalog linki, WhatsApp/DM sipariş ve barkodlu stok yönetim sistemi.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
