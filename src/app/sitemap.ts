import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://insta-whatsapp-siparis.vercel.app';

  try {
    const stores = await prisma.store.findMany({
      where: { isActive: true },
      select: {
        slug: true,
        createdAt: true,
      },
    });

    const storeEntries: MetadataRoute.Sitemap = stores.map((s) => ({
      url: `${baseUrl}/${s.slug}`,
      lastModified: s.createdAt,
      changeFrequency: 'daily',
      priority: 0.9,
    }));

    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 1.0,
      },
      ...storeEntries,
    ];
  } catch (error) {
    console.error('Sitemap error:', error);
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 1.0,
      },
    ];
  }
}
