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

  // GÜVENLİK (Vitrin 0 SSR Sızıntısı & Veri Azaltma):
  // pinCode, pinHash, ibanInfo ve orders KESİNLİKLE SEÇİLMEZ!
  // sku, barcode ve tam stok sayıları HTML'e basılmaz; sadece inStock ve lowStock döner.
  const store = await prisma.store.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      tagline: true,
      description: true,
      logoUrl: true,
      bannerUrl: true,
      themeColor: true,
      whatsappPhone: true,
      instagramHandle: true,
      shippingFee: true,
      freeShippingThreshold: true,
      address: true,
      allowStorePickup: true,
      isActive: true,
      stories: {
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          title: true,
          imageUrl: true,
          linkUrl: true,
        },
      },
      products: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          compareAtPrice: true,
          imageUrl: true,
          category: true,
          stock: true,
          isActive: true,
          hideWhenOutOfStock: true,
          instagramPostUrl: true,
          variants: {
            select: {
              id: true,
              name: true,
              priceDiff: true,
              stock: true,
            },
          },
        },
      },
    },
  });

  if (!store || !store.isActive) {
    notFound();
  }

  // Veri Azaltma Filtresi
  const sanitizedProducts = store.products.map((p) => {
    const inStock = p.stock > 0;
    const lowStock = p.stock > 0 && p.stock <= 3;

    const sanitizedVariants = p.variants.map((v) => ({
      id: v.id,
      name: v.name,
      priceDiff: v.priceDiff,
      inStock: v.stock > 0,
      lowStock: v.stock > 0 && v.stock <= 3,
    }));

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      imageUrl: p.imageUrl,
      category: p.category,
      isActive: p.isActive,
      hideWhenOutOfStock: p.hideWhenOutOfStock,
      instagramPostUrl: p.instagramPostUrl,
      inStock,
      lowStock,
      variants: sanitizedVariants,
    };
  });

  const publicStore = {
    slug: store.slug,
    name: store.name,
    tagline: store.tagline,
    description: store.description,
    logoUrl: store.logoUrl,
    bannerUrl: store.bannerUrl,
    themeColor: store.themeColor,
    whatsappPhone: store.whatsappPhone,
    instagramHandle: store.instagramHandle,
    shippingFee: store.shippingFee,
    freeShippingThreshold: store.freeShippingThreshold,
    address: store.address,
    allowStorePickup: store.allowStorePickup,
    stories: store.stories,
    products: sanitizedProducts,
  };

  return <StorefrontClient store={publicStore} />;
}
