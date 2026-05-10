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
import { cn } from '@/lib/utils';

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
  comparisonLabel,
  className
}: {
  changePercent: number;
  positiveLabel: string;
  negativeLabel: string;
  comparisonLabel: string;
  className?: string;
}) {
  const isPositive = changePercent >= 0;
  const TrendIcon = isPositive ? Icons.trendingUp : Icons.trendingDown;

  return (
    <CardFooter className={cn('flex-col items-start gap-1 text-[10px] md:gap-1.5 md:text-sm', className)}>
      <div className='line-clamp-1 flex gap-2 font-medium'>
        {isPositive ? positiveLabel : negativeLabel} <TrendIcon className='size-3 md:size-4' />
      </div>
      <div className='text-muted-foreground hidden md:block'>Compared with {comparisonLabel}</div>
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
  const summary = await fetchQuery(api.dashboard.getOverviewSummaryState, {}, convexOptions);

  return (
    <PageContainer>
      <div className='flex flex-1 flex-col space-y-2'>
        <div className='flex items-center justify-between'>
          <h2 className='text-2xl font-bold tracking-tight'>Hi, Welcome back 👋</h2>
        </div>

        <div className='*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-2 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:grid-cols-4'>
          <Card className='@container/card gap-4 py-4 md:gap-6 md:py-6'>
            <CardHeader className='px-4 md:px-6'>
              <CardDescription className='text-xs md:text-sm'>Active Conversations</CardDescription>
              <CardTitle className='text-xl font-semibold tabular-nums @[250px]/card:text-3xl md:text-2xl'>
                {formatWholeNumber(summary.activeConversations.value)}
              </CardTitle>
              <CardAction>
                <TrendBadge changePercent={summary.activeConversations.changePercent} />
              </CardAction>
            </CardHeader>
            <TrendFooter
              changePercent={summary.activeConversations.changePercent}
              positiveLabel='More'
              negativeLabel='Fewer'
              comparisonLabel={summary.comparisonPeriodLabel}
              className='px-4 pb-0 md:px-6 md:pb-6'
            />
          </Card>
          <Card className='@container/card gap-4 py-4 md:gap-6 md:py-6'>
            <CardHeader className='px-4 md:px-6'>
              <CardDescription className='text-xs md:text-sm'>Needs Attention</CardDescription>
              <CardTitle className='text-xl font-semibold tabular-nums @[250px]/card:text-3xl md:text-2xl text-amber-500'>
                {formatWholeNumber(summary.needsAttention.value)}
              </CardTitle>
              <CardAction>
                <TrendBadge changePercent={summary.needsAttention.changePercent} />
              </CardAction>
            </CardHeader>
            <TrendFooter
              changePercent={summary.needsAttention.changePercent}
              positiveLabel='More'
              negativeLabel='Fewer'
              comparisonLabel={summary.comparisonPeriodLabel}
              className='px-4 pb-0 md:px-6 md:pb-6'
            />
          </Card>
          <Card className='@container/card gap-4 py-4 md:gap-6 md:py-6'>
            <CardHeader className='px-4 md:px-6'>
              <CardDescription className='text-xs md:text-sm'>Messages Processed</CardDescription>
              <CardTitle className='text-xl font-semibold tabular-nums @[250px]/card:text-3xl md:text-2xl'>
                {formatWholeNumber(summary.messagesProcessed.value)}
              </CardTitle>
              <CardAction>
                <TrendBadge changePercent={summary.messagesProcessed.changePercent} />
              </CardAction>
            </CardHeader>
            <TrendFooter
              changePercent={summary.messagesProcessed.changePercent}
              positiveLabel='More'
              negativeLabel='Fewer'
              comparisonLabel={summary.comparisonPeriodLabel}
              className='px-4 pb-0 md:px-6 md:pb-6'
            />
          </Card>
          <Card className='@container/card gap-4 py-4 md:gap-6 md:py-6'>
            <CardHeader className='px-4 md:px-6'>
              <CardDescription className='text-xs md:text-sm'>AI Cost Estimator</CardDescription>
              <CardTitle className='text-xl font-semibold tabular-nums @[250px]/card:text-3xl md:text-2xl'>
                {formatCurrency(summary.aiCostEstimator.value, summary.aiCostEstimator.currency as 'USD' | 'IDR')}
              </CardTitle>
              <CardAction>
                <TrendBadge changePercent={summary.aiCostEstimator.changePercent} />
              </CardAction>
            </CardHeader>
            <TrendFooter
              changePercent={summary.aiCostEstimator.changePercent}
              positiveLabel='More'
              negativeLabel='Fewer'
              comparisonLabel={summary.comparisonPeriodLabel}
              className='px-4 pb-0 md:px-6 md:pb-6'
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
