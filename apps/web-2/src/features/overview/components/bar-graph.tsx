'use client';

import { Bar, BarChart, XAxis } from 'recharts';

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
  inbound: {
    label: 'Inbound',
    color: 'var(--chart-1)'
  },
  outbound: {
    label: 'Outbound',
    color: 'var(--chart-2)'
  }
} satisfies ChartConfig;

type BarGraphProps = {
  data: {
    rangeLabel: string;
    trendPercent: number;
    series: Array<{
      month: string;
      inbound: number;
      outbound: number;
    }>;
  };
};

export function BarGraph({ data }: BarGraphProps) {
  const isPositiveTrend = data.trendPercent >= 0;
  const TrendIcon = isPositiveTrend ? Icons.trendingUp : Icons.trendingDown;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Bar Chart - Multiple
          <Badge variant='outline'>
            <TrendIcon />
            {formatSignedPercent(data.trendPercent)}
          </Badge>
        </CardTitle>
        <CardDescription>{data.rangeLabel}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={data.series}>
            <rect
              x='0'
              y='0'
              width='100%'
              height='85%'
              fill='url(#default-multiple-pattern-dots)'
            />
            <defs>
              <DottedBackgroundPattern />
            </defs>
            <XAxis
              dataKey='month'
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator='dashed' hideLabel />}
            />
            <Bar
              dataKey='inbound'
              fill='var(--color-inbound)'
              shape={<CustomHatchedBar isHatched={false} />}
              radius={4}
            />
            <Bar
              dataKey='outbound'
              fill='var(--color-outbound)'
              shape={<CustomHatchedBar />}
              radius={4}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

const CustomHatchedBar = (
  props: React.SVGProps<SVGRectElement> & {
    dataKey?: string;
    isHatched?: boolean;
  }
) => {
  const { fill, x, y, width, height, dataKey } = props;

  const isHatched = props.isHatched ?? true;

  return (
    <>
      <rect
        rx={4}
        x={x}
        y={y}
        width={width}
        height={height}
        stroke='none'
        fill={isHatched ? `url(#hatched-bar-pattern-${dataKey})` : fill}
      />
      <defs>
        <pattern
          key={dataKey}
          id={`hatched-bar-pattern-${dataKey}`}
          x='0'
          y='0'
          width='5'
          height='5'
          patternUnits='userSpaceOnUse'
          patternTransform='rotate(-45)'
        >
          <rect width='10' height='10' opacity={0.5} fill={fill}></rect>
          <rect width='1' height='10' fill={fill}></rect>
        </pattern>
      </defs>
    </>
  );
};
const DottedBackgroundPattern = () => {
  return (
    <pattern
      id='default-multiple-pattern-dots'
      x='0'
      y='0'
      width='10'
      height='10'
      patternUnits='userSpaceOnUse'
    >
      <circle className='dark:text-muted/40 text-muted' cx='2' cy='2' r='1' fill='currentColor' />
    </pattern>
  );
};
