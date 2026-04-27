'use client';

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
import { formatSignedPercent } from '../lib/formatters';

const chartConfig = {
  value: {
    label: 'Messages'
  },
  text: {
    label: 'Text',
    color: 'var(--chart-1)'
  },
  image: {
    label: 'Image',
    color: 'var(--chart-2)'
  },
  document: {
    label: 'Document',
    color: 'var(--chart-3)'
  },
  audio: {
    label: 'Audio',
    color: 'var(--chart-4)'
  },
  other: {
    label: 'Other',
    color: 'var(--chart-5)'
  }
} satisfies ChartConfig;

type PieGraphProps = {
  data: {
    periodLabel: string;
    trendPercent: number;
    segments: Array<{
      type: 'text' | 'image' | 'document' | 'audio' | 'other';
      value: number;
    }>;
  };
};

export function PieGraph({ data }: PieGraphProps) {
  const isPositiveTrend = data.trendPercent >= 0;
  const TrendIcon = isPositiveTrend ? Icons.trendingUp : Icons.trendingDown;
  const chartData = data.segments.map((segment) => ({
    channel: segment.type,
    value: segment.value,
    fill: `var(--color-${segment.type})`
  }));

  return (
    <Card className='flex h-full flex-col'>
      <CardHeader className='items-center pb-0'>
        <CardTitle>
          Pie Chart
          <Badge variant='outline'>
            <TrendIcon />
            {formatSignedPercent(data.trendPercent)}
          </Badge>
        </CardTitle>
        <CardDescription>{data.periodLabel}</CardDescription>
      </CardHeader>
      <CardContent className='flex flex-1 items-center justify-center pb-0'>
        <ChartContainer
          config={chartConfig}
          className='[&_.recharts-text]:fill-background mx-auto aspect-square max-h-[300px] min-h-[250px]'
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey='channel' hideLabel />} />
            <Pie
              data={chartData}
              innerRadius={30}
              dataKey='value'
              radius={10}
              cornerRadius={8}
              paddingAngle={4}
            >
              <LabelList
                dataKey='value'
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
