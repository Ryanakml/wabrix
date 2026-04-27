'use client';

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
import { formatSignedPercent } from '../lib/formatters';

const chartConfig = {
  aiRuns: {
    label: 'AI Runs',
    color: 'var(--chart-1)'
  },
  delivered: {
    label: 'Delivered',
    color: 'var(--chart-2)'
  }
} satisfies ChartConfig;

type AreaGraphProps = {
  data: {
    trendPercent: number;
    series: Array<{
      month: string;
      aiRuns: number;
      delivered: number;
    }>;
  };
};

export function AreaGraph({ data }: AreaGraphProps) {
  const isPositiveTrend = data.trendPercent >= 0;
  const TrendIcon = isPositiveTrend ? Icons.trendingUp : Icons.trendingDown;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Dotted Area Chart
          <Badge variant='outline'>
            <TrendIcon />
            {formatSignedPercent(data.trendPercent)}
          </Badge>
        </CardTitle>
        <CardDescription>Showing AI runs and delivered messages for the last 12 months</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart accessibilityLayer data={data.series}>
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
              dataKey='delivered'
              type='natural'
              fill='url(#dotted-background-pattern-delivered)'
              fillOpacity={0.4}
              stroke='var(--color-delivered)'
              stackId='a'
              strokeWidth={0.8}
            />
            <Area
              dataKey='aiRuns'
              type='natural'
              fill='url(#dotted-background-pattern-aiRuns)'
              fillOpacity={0.4}
              stroke='var(--color-aiRuns)'
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
