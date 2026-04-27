import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardFooter
} from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { getConvexServerOptions } from '@/lib/convex-server';
import { formatCurrency, formatSignedPercent, formatWholeNumber } from '@/features/overview/lib/formatters';
import { api } from '@wabrix/backend/convex/_generated/api';
import { fetchQuery } from 'convex/nextjs';
import React from 'react';

function TrendBadge({ changePercent }: { changePercent: number }) {
  const isPositive = changePercent >= 0;
  const TrendIcon = isPositive ? Icons.trendingUp : Icons.trendingDown;

  return (
    <Badge variant='outline'>
      <TrendIcon />
      {formatSignedPercent(changePercent)}
    </Badge>
  );
}

function TrendFooter({
  changePercent,
  positiveLabel,
  negativeLabel,
  comparisonLabel
}: {
  changePercent: number;
  positiveLabel: string;
  negativeLabel: string;
  comparisonLabel: string;
}) {
  const isPositive = changePercent >= 0;
  const TrendIcon = isPositive ? Icons.trendingUp : Icons.trendingDown;

  return (
    <CardFooter className='flex-col items-start gap-1.5 text-sm'>
      <div className='line-clamp-1 flex gap-2 font-medium'>
        {isPositive ? positiveLabel : negativeLabel} <TrendIcon className='size-4' />
      </div>
      <div className='text-muted-foreground'>Compared with {comparisonLabel}</div>
    </CardFooter>
  );
}

export default async function OverViewLayout({
  sales,
  pie_stats,
  bar_stats,
  area_stats
}: {
  sales: React.ReactNode;
  pie_stats: React.ReactNode;
  bar_stats: React.ReactNode;
  area_stats: React.ReactNode;
}) {
  const convexOptions = await getConvexServerOptions();
  const summary = await fetchQuery(api.billing.getOverviewSummaryState, {}, convexOptions);

  return (
    <PageContainer>
      <div className='flex flex-1 flex-col space-y-2'>
        <div className='flex items-center justify-between'>
          <h2 className='text-2xl font-bold tracking-tight'>Hi, Welcome back 👋</h2>
        </div>

        <div className='*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs md:grid-cols-2 lg:grid-cols-4'>
          <Card className='@container/card'>
            <CardHeader>
              <CardDescription>Total Revenue</CardDescription>
              <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                {formatCurrency(summary.revenue.amount, summary.revenue.currency)}
              </CardTitle>
              <CardAction>
                <TrendBadge changePercent={summary.revenue.changePercent} />
              </CardAction>
            </CardHeader>
            <TrendFooter
              changePercent={summary.revenue.changePercent}
              positiveLabel='Revenue increased this month'
              negativeLabel='Revenue slowed this month'
              comparisonLabel={summary.comparisonPeriodLabel}
            />
          </Card>
          <Card className='@container/card'>
            <CardHeader>
              <CardDescription>New Customers</CardDescription>
              <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                {formatWholeNumber(summary.newCustomers.value)}
              </CardTitle>
              <CardAction>
                <TrendBadge changePercent={summary.newCustomers.changePercent} />
              </CardAction>
            </CardHeader>
            <TrendFooter
              changePercent={summary.newCustomers.changePercent}
              positiveLabel='More inbound customer activity'
              negativeLabel='Fewer inbound customer messages'
              comparisonLabel={summary.comparisonPeriodLabel}
            />
          </Card>
          <Card className='@container/card'>
            <CardHeader>
              <CardDescription>Active Accounts</CardDescription>
              <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                {formatWholeNumber(summary.activeAccounts.value)}
              </CardTitle>
              <CardAction>
                <TrendBadge changePercent={summary.activeAccounts.changePercent} />
              </CardAction>
            </CardHeader>
            <TrendFooter
              changePercent={summary.activeAccounts.changePercent}
              positiveLabel='Workspace access is expanding'
              negativeLabel='Workspace access is holding steady'
              comparisonLabel={summary.comparisonPeriodLabel}
            />
          </Card>
          <Card className='@container/card'>
            <CardHeader>
              <CardDescription>Growth Rate</CardDescription>
              <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                {formatSignedPercent(summary.growthRate.value)}
              </CardTitle>
              <CardAction>
                <TrendBadge changePercent={summary.growthRate.changePercent} />
              </CardAction>
            </CardHeader>
            <TrendFooter
              changePercent={summary.growthRate.changePercent}
              positiveLabel='Activity grew across AI and messaging'
              negativeLabel='Activity cooled versus last month'
              comparisonLabel={summary.comparisonPeriodLabel}
            />
          </Card>
        </div>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7'>
          <div className='col-span-4'>{bar_stats}</div>
          <div className='col-span-4 md:col-span-3'>{sales}</div>
          <div className='col-span-4'>{area_stats}</div>
          <div className='col-span-4 min-h-0 md:col-span-3'>{pie_stats}</div>
        </div>
      </div>
    </PageContainer>
  );
}
