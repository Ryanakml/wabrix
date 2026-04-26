"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { appName } from "@wabrix/config";
import { Menu, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type PublicShellProps = {
  children: React.ReactNode;
};

function NavLinks({
  locale,
  pathname,
  mobile = false,
}: {
  locale: string;
  pathname: string;
  mobile?: boolean;
}) {
  const t = useTranslations("Marketing.nav");
  const items = [
    { href: `/${locale}`, label: t("overview") },
    { href: `/${locale}/pricing`, label: t("pricing") },
    { href: `/${locale}/docs`, label: t("docs") },
  ];

  return items.map((item) => {
    const active = pathname === item.href;

    if (mobile) {
      return (
        <Button
          key={item.href}
          asChild
          variant={active ? "secondary" : "ghost"}
          className="justify-start"
        >
          <Link href={item.href}>{item.label}</Link>
        </Button>
      );
    }

    return (
      <NavigationMenuItem key={item.href}>
        <NavigationMenuLink asChild active={active}>
          <Link
            href={item.href}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        </NavigationMenuLink>
      </NavigationMenuItem>
    );
  });
}

export function PublicShell({ children }: PublicShellProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("Marketing");

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),_rgba(255,255,255,0)_32%),linear-gradient(180deg,_#0b1020_0%,_#111827_24%,_#eef3ff_24%,_#f8fafc_100%)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.18),_transparent_24%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        <header className="sticky top-4 z-30">
          <div className="mx-auto flex items-center justify-between rounded-[1.5rem] border border-white/15 bg-slate-950/80 px-4 py-3 text-white shadow-[0_24px_80px_rgba(2,6,23,0.35)] backdrop-blur-xl">
            <Link href={`/${locale}`} className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-sm">
                <Sparkles className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{appName}</p>
                <p className="text-xs text-slate-400">{t("nav.tagline")}</p>
              </div>
            </Link>

            <div className="hidden items-center gap-4 lg:flex">
              <NavigationMenu viewport={false}>
                <NavigationMenuList className="gap-1">
                  <NavLinks locale={locale} pathname={pathname} />
                </NavigationMenuList>
              </NavigationMenu>

              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                  <Link href={locale === "en" ? "/id" : "/en"}>
                    {locale === "en" ? "ID" : "EN"}
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                  <Link href={`/${locale}/dashboard`}>{t("nav.dashboard")}</Link>
                </Button>
                <Button
                  asChild
                  className="bg-white text-slate-950 hover:bg-slate-200"
                >
                  <Link href={`/${locale}/pricing`}>{t("nav.cta")}</Link>
                </Button>
              </div>
            </div>

            <Sheet>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white">
                  <Menu className="size-5" />
                  <span className="sr-only">{t("nav.openMenu")}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[22rem] bg-slate-950 text-white">
                <SheetHeader>
                  <SheetTitle>{appName}</SheetTitle>
                  <SheetDescription className="text-slate-400">
                    {t("nav.mobileDescription")}
                  </SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-2 px-4 pb-4">
                  <NavLinks locale={locale} pathname={pathname} mobile />
                  <Button asChild variant="ghost" className="justify-start text-white hover:bg-white/10 hover:text-white">
                    <Link href={locale === "en" ? "/id" : "/en"}>
                      {locale === "en" ? "Bahasa Indonesia" : "English"}
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="justify-start text-white hover:bg-white/10 hover:text-white">
                    <Link href={`/${locale}/dashboard`}>{t("nav.dashboard")}</Link>
                  </Button>
                  <Button
                    asChild
                    className="justify-start bg-white text-slate-950 hover:bg-slate-200"
                  >
                    <Link href={`/${locale}/pricing`}>{t("nav.cta")}</Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="mt-16 rounded-[2rem] border border-slate-200/80 bg-white/80 px-6 py-8 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <p className="text-sm font-semibold text-slate-900">{appName}</p>
              <p className="text-sm leading-7 text-slate-600">
                {t("footer.description")}
              </p>
            </div>
            <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:min-w-[24rem]">
              <Link href={`/${locale}/pricing`} className="hover:text-slate-950">
                {t("footer.pricing")}
              </Link>
              <Link href={`/${locale}/docs`} className="hover:text-slate-950">
                {t("footer.docs")}
              </Link>
              <Link
                href={`/${locale}/dashboard/whatsapp-integration`}
                className="hover:text-slate-950"
              >
                {t("footer.whatsapp")}
              </Link>
              <Link href={`/${locale}/dashboard/billing`} className="hover:text-slate-950">
                {t("footer.billing")}
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
