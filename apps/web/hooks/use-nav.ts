"use client";

import { useMemo } from "react";
import { useOrganization } from "@clerk/nextjs";
import type { NavGroup, NavItem } from "@/config/nav-config";

export function useFilteredNavItems(items: NavItem[]) {
  const { organization } = useOrganization();

  return useMemo(
    () =>
      items
        .filter((item) => {
          if (!item.access) {
            return true;
          }

          if (item.access.requireOrg && !organization) {
            return false;
          }

          return true;
        })
        .map((item) => ({
          ...item,
          items: item.items?.filter((childItem) => {
            if (!childItem.access) {
              return true;
            }

            if (childItem.access.requireOrg && !organization) {
              return false;
            }

            return true;
          }),
        })),
    [items, organization],
  );
}

export function useFilteredNavGroups(groups: NavGroup[]) {
  const allItems = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const filteredItems = useFilteredNavItems(allItems);

  return useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: filteredItems.filter((item) =>
            group.items.some((groupItem) => groupItem.title === item.title),
          ),
        }))
        .filter((group) => group.items.length > 0),
    [filteredItems, groups],
  );
}
