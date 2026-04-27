'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function MessengerSkeleton() {
  return (
    <div className='border-border/50 bg-background/70 relative grid h-[calc(100dvh-5.5rem)] w-full grid-rows-[auto,1fr] gap-3 overflow-hidden rounded-2xl border p-3 backdrop-blur-xl sm:gap-4 sm:p-4 lg:[grid-template-columns:30%_1fr] lg:grid-rows-[1fr] lg:gap-4 lg:rounded-3xl lg:p-5'>
      <div className='border-border/40 bg-background/75 flex flex-col gap-3 rounded-2xl border p-3 backdrop-blur sm:gap-4 sm:rounded-3xl sm:p-4 lg:hidden'>
        <Skeleton className='h-10 w-full rounded-2xl' />
        <Skeleton className='h-10 w-full rounded-2xl' />
      </div>

      <div className='border-border/40 bg-background/75 hidden h-full flex-col gap-4 overflow-hidden rounded-2xl border p-3 backdrop-blur lg:flex lg:rounded-3xl lg:p-4'>
        <Skeleton className='h-10 w-full rounded-2xl' />
        <Skeleton className='h-10 w-full rounded-2xl' />
        <div className='space-y-2'>
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className='h-20 w-full rounded-2xl' />
          ))}
        </div>
      </div>

      <div className='border-border/40 bg-background/80 flex min-h-0 flex-col gap-3 overflow-hidden rounded-2xl border p-3 backdrop-blur sm:gap-4 sm:p-4 lg:rounded-3xl'>
        <div className='flex items-center justify-between gap-3'>
          <div className='flex items-center gap-3'>
            <Skeleton className='h-12 w-12 rounded-3xl' />
            <div className='space-y-2'>
              <Skeleton className='h-4 w-32' />
              <Skeleton className='h-3 w-24' />
            </div>
          </div>
          <div className='flex gap-2'>
            <Skeleton className='h-10 w-10 rounded-full' />
            <Skeleton className='h-10 w-10 rounded-full' />
            <Skeleton className='h-10 w-10 rounded-full' />
          </div>
        </div>

        <div className='min-h-0 flex-1 space-y-3 overflow-hidden'>
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className={index % 2 === 0 ? 'mr-auto max-w-[85%]' : 'ml-auto max-w-[85%]'}>
              <Skeleton className='h-20 w-full rounded-2xl' />
            </div>
          ))}
        </div>

        <div className='border-border/40 bg-background/80 flex items-end gap-2 rounded-2xl border p-3 backdrop-blur sm:gap-3 sm:rounded-3xl sm:p-4'>
          <Skeleton className='h-20 flex-1 rounded-2xl' />
          <div className='flex flex-col gap-2'>
            <Skeleton className='h-10 w-10 rounded-full' />
            <Skeleton className='h-10 w-10 rounded-full' />
          </div>
        </div>
      </div>
    </div>
  );
}
