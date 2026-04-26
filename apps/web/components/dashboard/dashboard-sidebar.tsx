"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3Icon,
  BookOpenTextIcon,
  BotIcon,
  CreditCardIcon,
  InboxIcon,
  MessageCircleMoreIcon,
  SparklesIcon,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { dashboardNavigation } from "@/components/dashboard/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const navigationIcons = {
  "Bot Profile": BotIcon,
  "Knowledge Base": BookOpenTextIcon,
  Inbox: InboxIcon,
  "WhatsApp Integration": MessageCircleMoreIcon,
  Billing: CreditCardIcon,
  Analytics: BarChart3Icon,
} as const satisfies Record<
  (typeof dashboardNavigation)[number]["label"],
  typeof BotIcon
>;

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar({ locale }: { locale: string }) {
  const pathname = usePathname();

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="gap-3 p-3">
        <Link
          href={`/${locale}/dashboard`}
          className="group flex items-center gap-3 rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/40 px-3 py-3 transition-colors hover:bg-sidebar-accent"
        >
          <div className="flex size-10 items-center justify-center rounded-xl bg-foreground text-background shadow-sm group-data-[collapsible=icon]:size-9">
            <SparklesIcon className="size-4" />
          </div>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold tracking-tight">Wabrix Studio</p>
            <p className="truncate text-xs text-sidebar-foreground/65">
              WhatsApp chatbot workspace
            </p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="pt-1">
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarMenu>
            {dashboardNavigation.map((item) => {
              const href = `/${locale}${item.href}`;
              const Icon = navigationIcons[item.label];
              const active = isActivePath(pathname, href);

              return (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    className={cn(
                      "text-sidebar-foreground/85 hover:text-sidebar-foreground",
                      active && "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
                    )}
                  >
                    <Link href={href}>
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 pt-0">
        <div className="flex items-center gap-3 rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/35 px-3 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3 group-data-[collapsible=icon]:justify-center">
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: "h-9 w-9",
                },
              }}
            />
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-medium">Workspace Account</p>
              <p className="truncate text-xs text-sidebar-foreground/65">
                Manage bot, inbox, and billing
              </p>
            </div>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
