'use client';

import { useQuery } from 'convex/react';
import { LabelList, Pie, PieChart } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { api } from '@wabrix/backend/convex/_generated/api';
import { buildPieChartData, buildPieTrend } from '@/features/overview/lib/overview-data';

const chartConfig = {
  visitors: {
    label: 'Conversations'
  },
  open: {
    label: 'Open',
    color: 'var(--chart-1)'
  },
  closed: {
    label: 'Closed',
    color: 'var(--chart-2)'
  },
  handoff: {
    label: 'Handoff',
    color: 'var(--chart-3)'
  },
  botPaused: {
    label: 'Bot Paused',
    color: 'var(--chart-5)'
  }
} satisfies ChartConfig;

export function PieGraph() {
  const analytics = useQuery(api.billing.getAnalyticsDashboardState, {});
  const chartData = buildPieChartData(analytics);
  const trend = buildPieTrend(analytics);

  return (
    <Card className='flex h-full flex-col'>
      <CardHeader className='items-center pb-0'>
        <CardTitle>
          Pie Chart
          <Badge variant='outline'>
            <Icons.trendingUp />
            {trend.badge}
          </Badge>
        </CardTitle>
        <CardDescription>{trend.description}</CardDescription>
      </CardHeader>
      <CardContent className='flex flex-1 items-center justify-center pb-0'>
        <ChartContainer
          config={chartConfig}
          className='[&_.recharts-text]:fill-background mx-auto aspect-square max-h-[300px] min-h-[250px]'
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey='visitors' hideLabel />} />
            <Pie
              data={chartData}
              innerRadius={30}
              dataKey='visitors'
              radius={10}
              cornerRadius={8}
              paddingAngle={4}
            >
              <LabelList
                dataKey='visitors'
                stroke='none'
                fontSize={12}
                fontWeight={500}
                fill='currentColor'
                formatter={(value: number) => value.toString()}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
