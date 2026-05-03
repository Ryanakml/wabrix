'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { docsNavGroups } from '@/features/public-site/docs-content';
import { cn } from '@/lib/utils';

export function DocsSidebarNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label='Documentation navigation'>
      <div className={cn('space-y-6', mobile && 'space-y-4')}>
        {docsNavGroups.map((group) => (
          <div key={group.title} className='space-y-3'>
            <div className='text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase'>
              {group.title}
            </div>
            <div className={cn('space-y-2', mobile && 'grid gap-2 space-y-0 sm:grid-cols-2')}>
              {group.links.map((link) => {
                const isActive = pathname === link.href;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'block rounded-2xl border px-4 py-3 transition',
                      isActive
                        ? 'border-violet-200 bg-violet-50 text-gray-900'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:text-gray-900'
                    )}
                  >
                    <div className='text-sm font-semibold'>{link.title}</div>
                    <p className='mt-1 text-sm text-gray-500'>{link.description}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}
