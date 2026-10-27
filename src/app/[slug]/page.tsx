import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ensureDemoStore } from '@/lib/ensureSeed';
import StorefrontClient from '@/components/StorefrontClient';

export const dynamic = 'force-dynamic';

export default async function StorePage({
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
    },
  });

  if (!store) {
    notFound();
  }

  return <StorefrontClient store={store} />;
}
