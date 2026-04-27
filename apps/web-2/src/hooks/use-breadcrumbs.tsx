'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

type BreadcrumbItem = {
  title: string;
  link: string;
};

// This allows to add custom title as well
const routeMapping: Record<string, BreadcrumbItem[]> = {
  '/dashboard': [{ title: 'Dashboard', link: '/dashboard' }],
  '/dashboard/overview': [{ title: 'Dashboard', link: '/dashboard' }],
  '/chat': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Chat', link: '/chat' }
  ],
  '/contacts': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Contacts', link: '/contacts' }
  ],
  '/knowledge-base': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Knowledge Base', link: '/knowledge-base' }
  ],
  '/bot-configurations': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Bot Configurations', link: '/bot-configurations' }
  ],
  '/whatsapp-integration': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'WhatsApp Integration', link: '/whatsapp-integration' }
  ],
  '/dashboard/employee': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Employee', link: '/dashboard/employee' }
  ],
  '/dashboard/product': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Product', link: '/dashboard/product' }
  ],
  '/dashboard/profile': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Profile', link: '/dashboard/profile' }
  ],
  '/dashboard/notifications': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Notifications', link: '/dashboard/notifications' }
  ],
  '/dashboard/billing': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Billing', link: '/dashboard/billing' }
  ]
  // Add more custom mappings as needed
};

export function useBreadcrumbs() {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    // Check if we have a custom mapping for this exact path
    if (routeMapping[pathname]) {
      return routeMapping[pathname];
    }

    // If no exact match, fall back to generating breadcrumbs from the path
    const segments = pathname.split('/').filter(Boolean);
    return segments.map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join('/')}`;
      return {
        title: segment.charAt(0).toUpperCase() + segment.slice(1),
        link: path
      };
    });
  }, [pathname]);

  return breadcrumbs;
}
