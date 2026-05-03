import type { Metadata } from 'next';
import { siteConfig } from '@/app/siteConfig';

export function absoluteUrl(path = '/') {
  return new URL(path, siteConfig.url).toString();
}

type CreatePageMetadataInput = {
  title: string;
  description: string;
  path: string;
  image?: string;
};

export function createPageMetadata({
  title,
  description,
  path,
  image = siteConfig.ogImage
}: CreatePageMetadataInput): Metadata {
  const canonicalUrl = absoluteUrl(path);
  const imageUrl = absoluteUrl(image);

  return {
    title,
    description,
    alternates: {
      canonical: path
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: siteConfig.name,
      type: 'website',
      images: [
        {
          url: imageUrl
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl]
    }
  };
}
