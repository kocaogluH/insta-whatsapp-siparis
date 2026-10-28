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
    description: `${slug} butiği satıcı stok ve sipariş yönetim paneli.`,
  };
}

export default async function StorePanelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await ensureDemoStore();

  const store = await prisma.store.findUnique({
    where: { slug },
    include: {
      products: {
        include: { variants: true },
        orderBy: { createdAt: 'desc' },
      },
      orders: {
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!store || !store.isActive) {
    notFound();
  }

  // Format dates to string for serialization
  const serializedStore = {
    ...store,
    createdAt: store.createdAt.toISOString(),
    products: store.products.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
    })),
    orders: store.orders.map((o) => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
    })),
  };

  return <SellerPanelClient initialStore={serializedStore} slug={slug} />;
}
