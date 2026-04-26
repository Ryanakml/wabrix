'use client';

import { useQuery } from 'convex/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { api } from '@wabrix/backend/convex/_generated/api';
import { buildRecentActivity } from '@/features/overview/lib/overview-data';

export function RecentSales() {
  const analytics = useQuery(api.billing.getAnalyticsDashboardState, {});
  const salesData = buildRecentActivity(analytics);

  return (
    <Card className='h-full'>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          {salesData.length > 0
            ? `Latest ${salesData.length} messages captured from the transcript stream.`
            : 'Waiting for recent message activity.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='space-y-8'>
          {salesData.map((sale) => (
            <div key={sale.id} className='flex items-center'>
              <Avatar className='h-9 w-9'>
                <AvatarImage src={sale.avatar} alt='Avatar' />
                <AvatarFallback>{sale.fallback}</AvatarFallback>
              </Avatar>
              <div className='ml-4 space-y-1'>
                <p className='text-sm leading-none font-medium'>{sale.name}</p>
                <p className='text-muted-foreground text-sm'>{sale.email}</p>
              </div>
              <div className='ml-auto font-medium'>{sale.amount}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
