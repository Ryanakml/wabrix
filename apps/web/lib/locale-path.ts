export function withLocale(locale: string, href: string) {
  if (!href || href.startsWith("#")) {
    return href;
  }

  if (href === "/") {
    return `/${locale}`;
  }

  return href.startsWith(`/${locale}/`) || href === `/${locale}`
    ? href
    : `/${locale}${href.startsWith("/") ? href : `/${href}`}`;
}

export function stripLocale(pathname: string, locale: string) {
  const localePrefix = `/${locale}`;

  if (pathname === localePrefix) {
    return "/";
  }

  return pathname.startsWith(`${localePrefix}/`)
    ? pathname.slice(localePrefix.length)
    : pathname;
}
