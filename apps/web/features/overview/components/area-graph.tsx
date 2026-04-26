'use client';

import { useQuery } from 'convex/react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import React from 'react';
import { api } from '@wabrix/backend/convex/_generated/api';
import { buildAreaChartData, buildAreaTrend } from '@/features/overview/lib/overview-data';

const chartConfig = {
  desktop: {
    label: 'Prompt Tokens',
    color: 'var(--chart-1)'
  },
  mobile: {
    label: 'Completion Tokens',
    color: 'var(--chart-2)'
  }
} satisfies ChartConfig;

export function AreaGraph() {
  const analytics = useQuery(api.billing.getAnalyticsDashboardState, {});
  const chartData = buildAreaChartData(analytics);
  const trend = buildAreaTrend(analytics);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Dotted Area Chart
          <Badge variant='outline'>
            {trend.change >= 0 ? <Icons.trendingUp /> : <Icons.trendingDown />}
            {trend.badge}
          </Badge>
        </CardTitle>
        <CardDescription>{trend.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} strokeDasharray='3 3' />
            <XAxis
              dataKey='month'
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <defs>
              <DottedBackgroundPattern config={chartConfig} />
            </defs>
            <Area
              dataKey='mobile'
              type='natural'
              fill='url(#dotted-background-pattern-mobile)'
              fillOpacity={0.4}
              stroke='var(--color-mobile)'
              stackId='a'
              strokeWidth={0.8}
            />
            <Area
              dataKey='desktop'
              type='natural'
              fill='url(#dotted-background-pattern-desktop)'
              fillOpacity={0.4}
              stroke='var(--color-desktop)'
              stackId='a'
              strokeWidth={0.8}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

const DottedBackgroundPattern = ({ config }: { config: ChartConfig }) => {
  const items = Object.fromEntries(
    Object.entries(config).map(([key, value]) => [key, value.color])
  );
  return (
    <>
      {Object.entries(items).map(([key, value]) => (
        <pattern
          key={key}
          id={`dotted-background-pattern-${key}`}
          x='0'
          y='0'
          width='7'
          height='7'
          patternUnits='userSpaceOnUse'
        >
          <circle cx='5' cy='5' r='1.5' fill={value} opacity={0.5}></circle>
        </pattern>
      ))}
    </>
  );
};
