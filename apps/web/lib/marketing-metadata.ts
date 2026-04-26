import type { Metadata } from "next";
import { appDescription, appName, defaultLocale, supportedLocales } from "@wabrix/config";

function getMetadataBase() {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!siteUrl) {
    return undefined;
  }

  try {
    return new URL(siteUrl);
  } catch {
    return undefined;
  }
}

export function buildMarketingMetadata({
  locale,
  pathname,
  title,
  description,
  keywords = [],
}: {
  locale: string;
  pathname: string;
  title: string;
  description: string;
  keywords?: string[];
}): Metadata {
  const normalizedPath = pathname === "/" ? "" : pathname;
  const canonicalPath = `/${locale}${normalizedPath}`;

  return {
    metadataBase: getMetadataBase(),
    title,
    description,
    keywords,
    alternates: {
      canonical: canonicalPath,
      languages: Object.fromEntries(
        supportedLocales.map((entry) => [
          entry,
          `/${entry}${normalizedPath}`,
        ]),
      ),
    },
    openGraph: {
      type: "website",
      locale,
      siteName: appName,
      title,
      description,
      url: canonicalPath,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: `${appName} marketing preview`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/twitter-image"],
    },
  };
}

export function buildRootMetadata(): Metadata {
  return {
    metadataBase: getMetadataBase(),
    title: {
      default: `${appName} | WhatsApp AI For Revenue Teams`,
      template: `%s | ${appName}`,
    },
    description: appDescription,
    alternates: {
      canonical: `/${defaultLocale}`,
      languages: Object.fromEntries(
        supportedLocales.map((locale) => [locale, `/${locale}`]),
      ),
    },
    openGraph: {
      type: "website",
      siteName: appName,
      title: `${appName} | WhatsApp AI For Revenue Teams`,
      description: appDescription,
      url: `/${defaultLocale}`,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: `${appName} social preview`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${appName} | WhatsApp AI For Revenue Teams`,
      description: appDescription,
      images: ["/twitter-image"],
    },
  };
}
