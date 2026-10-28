import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ensureDemoStore } from '@/lib/ensureSeed';
import StorefrontClient from '@/components/StorefrontClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  await ensureDemoStore();

  const store = await prisma.store.findUnique({
    where: { slug },
    select: {
      name: true,
      tagline: true,
      description: true,
      logoUrl: true,
      bannerUrl: true,
    },
  });

  if (!store) {
    return {
      title: 'Mağaza Bulunamadı | InstaSipariş',
    };
  }

  const title = `${store.name} | Instagram & WhatsApp Sipariş Kataloğu`;
  const description =
    store.tagline ||
    store.description ||
    `${store.name} güncel ürünlerini inceleyin, Instagram veya WhatsApp üzerinden hızlıca sipariş verin.`;

  const ogImages = store.logoUrl ? [store.logoUrl] : store.bannerUrl ? [store.bannerUrl] : [];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ogImages,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImages,
    },
  };
}

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
      stories: {
        orderBy: { orderIndex: 'asc' },
      },
      products: {
        include: { variants: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!store || !store.isActive) {
    notFound();
  }

  return <StorefrontClient store={store} />;
}
