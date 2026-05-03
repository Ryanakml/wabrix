import type { MetadataRoute } from 'next';
import { siteConfig } from '@/app/siteConfig';

const publicRoutes = [
  '/',
  '/pricing',
  '/docs',
  '/docs/setup',
  '/docs/whatsapp/waba-lifecycle',
  '/docs/whatsapp/template-approval',
  '/docs/whatsapp/media-processing',
  '/docs/whatsapp/service-window',
  '/security',
  '/privacy-policy',
  '/terms-of-service'
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicRoutes.map((path) => ({
    url: new URL(path, siteConfig.url).toString(),
    lastModified,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : path === '/pricing' || path === '/docs' ? 0.8 : 0.6
  }));
}
