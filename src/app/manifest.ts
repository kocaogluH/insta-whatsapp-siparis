import type { MetadataRoute } from 'next';
import { SITE_NAME } from '@/lib/constants';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} | Butik Bio Kataloğu & Sipariş`,
    short_name: SITE_NAME,
    description: 'Instagram butikleri ve mağazalar için bio sipariş ve stok kataloğu.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f4ee',
    theme_color: '#3c302a',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
