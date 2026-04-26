"use client";

import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { stripLocale } from "@/lib/locale-path";

type BreadcrumbItem = {
  title: string;
  link: string;
};

const routeMapping: Record<string, BreadcrumbItem[]> = {
  "/dashboard": [{ title: "Dashboard", link: "/dashboard" }],
  "/dashboard/chat": [
    { title: "Dashboard", link: "/dashboard" },
    { title: "Chat", link: "/dashboard/chat" },
  ],
  "/dashboard/kanban": [
    { title: "Dashboard", link: "/dashboard" },
    { title: "Kanban", link: "/dashboard/kanban" },
  ],
  "/dashboard/users": [
    { title: "Dashboard", link: "/dashboard" },
    { title: "Users", link: "/dashboard/users" },
  ],
  "/dashboard/workspaces": [
    { title: "Dashboard", link: "/dashboard" },
    { title: "Workspaces", link: "/dashboard/workspaces" },
  ],
  "/dashboard/product": [
    { title: "Dashboard", link: "/dashboard" },
    { title: "Product", link: "/dashboard/product" },
  ],
  "/dashboard/profile": [
    { title: "Dashboard", link: "/dashboard" },
    { title: "Profile", link: "/dashboard/profile" },
  ],
  "/dashboard/notifications": [
    { title: "Dashboard", link: "/dashboard" },
    { title: "Notifications", link: "/dashboard/notifications" },
  ],
};

export function useBreadcrumbs() {
  const locale = useLocale();
  const pathname = usePathname();

  return useMemo(() => {
    const normalizedPathname = stripLocale(pathname, locale);

    if (routeMapping[normalizedPathname]) {
      return routeMapping[normalizedPathname];
    }

    const segments = normalizedPathname.split("/").filter(Boolean);

    return segments.map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join("/")}`;

      return {
        title: segment.charAt(0).toUpperCase() + segment.slice(1),
        link: path,
      };
    });
  }, [locale, pathname]);
}
