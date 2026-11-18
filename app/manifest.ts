import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'YojanaMitra — Government Welfare Scheme Assistant',
    short_name: 'YojanaMitra',
    description:
      'Discover verified Indian government schemes in Marathi, Hindi, and English with deterministic eligibility checks, document checklists, and official links.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF8F4',
    theme_color: '#0F6B6E',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
