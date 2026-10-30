import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://insta-whatsapp-siparis.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/*/panel',
          '/*/panel/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
