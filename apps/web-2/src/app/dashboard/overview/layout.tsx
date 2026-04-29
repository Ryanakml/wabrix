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
  const summary = await fetchQuery(api.dashboard.getOverviewSummaryState, {}, convexOptions);

  return (
    <PageContainer>
      <div className='flex flex-1 flex-col space-y-2'>
        <div className='flex items-center justify-between'>
          <h2 className='text-2xl font-bold tracking-tight'>Hi, Welcome back 👋</h2>
        </div>

        <div className='*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs md:grid-cols-2 lg:grid-cols-4'>
          <Card className='@container/card'>
            <CardHeader>
              <CardDescription>Active Conversations</CardDescription>
              <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                {formatWholeNumber(summary.activeConversations.value)}
              </CardTitle>
              <CardAction>
                <TrendBadge changePercent={summary.activeConversations.changePercent} />
              </CardAction>
            </CardHeader>
            <TrendFooter
              changePercent={summary.activeConversations.changePercent}
              positiveLabel='More active conversations'
              negativeLabel='Fewer active conversations'
              comparisonLabel={summary.comparisonPeriodLabel}
            />
          </Card>
          <Card className='@container/card'>
            <CardHeader>
              <CardDescription>Needs Attention</CardDescription>
              <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-amber-500'>
                {formatWholeNumber(summary.needsAttention.value)}
              </CardTitle>
              <CardAction>
                <TrendBadge changePercent={summary.needsAttention.changePercent} />
              </CardAction>
            </CardHeader>
            <TrendFooter
              changePercent={summary.needsAttention.changePercent}
              positiveLabel='More conversations need attention'
              negativeLabel='Fewer conversations need attention'
              comparisonLabel={summary.comparisonPeriodLabel}
            />
          </Card>
          <Card className='@container/card'>
            <CardHeader>
              <CardDescription>Messages Processed</CardDescription>
              <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                {formatWholeNumber(summary.messagesProcessed.value)}
              </CardTitle>
              <CardAction>
                <TrendBadge changePercent={summary.messagesProcessed.changePercent} />
              </CardAction>
            </CardHeader>
            <TrendFooter
              changePercent={summary.messagesProcessed.changePercent}
              positiveLabel='More messages processed'
              negativeLabel='Fewer messages processed'
              comparisonLabel={summary.comparisonPeriodLabel}
            />
          </Card>
          <Card className='@container/card'>
            <CardHeader>
              <CardDescription>AI Cost Estimator</CardDescription>
              <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                {formatCurrency(summary.aiCostEstimator.value, summary.aiCostEstimator.currency as 'USD' | 'IDR')}
              </CardTitle>
              <CardAction>
                <TrendBadge changePercent={summary.aiCostEstimator.changePercent} />
              </CardAction>
            </CardHeader>
            <TrendFooter
              changePercent={summary.aiCostEstimator.changePercent}
              positiveLabel='Estimated AI cost increased'
              negativeLabel='Estimated AI cost decreased'
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
