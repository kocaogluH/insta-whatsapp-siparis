import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'InstaSipariş | Butik Bio Kataloğu & Sipariş',
    short_name: 'InstaSipariş',
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
