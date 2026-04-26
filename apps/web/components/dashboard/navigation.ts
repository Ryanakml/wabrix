export type DashboardNavigationItem = {
  label: string;
  href: string;
  match?: (pathname: string, href: string) => boolean;
};

export const dashboardNavigation = [
  {
    label: "Bot Profile",
    href: "/dashboard/bot-profile",
  },
  {
    label: "Knowledge Base",
    href: "/dashboard/knowledge-base",
  },
  {
    label: "Inbox",
    href: "/dashboard/inbox",
  },
  {
    label: "WhatsApp Integration",
    href: "/dashboard/whatsapp-integration",
  },
  {
    label: "Billing",
    href: "/dashboard/billing",
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
  },
] as const satisfies readonly DashboardNavigationItem[];
