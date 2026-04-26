"use client";

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { SparklesIcon } from "lucide-react";
import { dashboardNavigation } from "@/components/dashboard/navigation";
import { ThemeModeToggle } from "@/components/dashboard/theme-mode-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

function getActiveLabel(pathname: string, locale: string) {
  const fallback = "Dashboard";

  for (const item of dashboardNavigation) {
    const href = `/${locale}${item.href}`;
    if (pathname === href || pathname.startsWith(`${href}/`)) {
      return item.label;
    }
  }

  return fallback;
}

export function DashboardHeader({ locale }: { locale: string }) {
  const pathname = usePathname();
  const activeLabel = getActiveLabel(pathname, locale);

  return (
    <header className="bg-background/75 sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border/60 px-4 backdrop-blur-md md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="hidden h-5 sm:block" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary sm:hidden">
              <SparklesIcon className="size-3.5" />
            </span>
            <p className="truncate text-sm font-semibold tracking-tight">{activeLabel}</p>
          </div>
          <p className="hidden text-xs text-muted-foreground sm:block">
            Unified shell for your WhatsApp automation workspace
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden lg:block">
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl={`/${locale}/dashboard`}
            afterLeaveOrganizationUrl={`/${locale}/onboarding`}
            afterSelectOrganizationUrl={`/${locale}/dashboard`}
          />
        </div>
        <ThemeModeToggle />
        <div className="hidden sm:block">
          <UserButton />
        </div>
      </div>
    </header>
  );
}
