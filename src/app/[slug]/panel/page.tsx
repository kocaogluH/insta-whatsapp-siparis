import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ensureDemoStore } from '@/lib/ensureSeed';
import SellerPanelClient from '@/components/SellerPanelClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Yönetim Paneli | ${slug} - InstaSipariş`,
    robots: { index: false, follow: false },
  };
}

export default async function StorePanelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await ensureDemoStore();

  // GÜVENLİK (SSR Sızıntısı Engellendi):
  // Yalnızca giriş formu için gereken genel mağaza başlık bilgileri seçilir.
  // pinCode, pinHash, ibanInfo ve orders KESİNLİKLE SEÇİLMEZ VE HTML'E BASILMAZ!
  const store = await prisma.store.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      themeColor: true,
      logoUrl: true,
      isActive: true,
    },
  });

  if (!store || !store.isActive) {
    notFound();
  }

  return <SellerPanelClient publicStore={store} slug={slug} />;
}
