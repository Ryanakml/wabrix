import { BarGraph } from '@/features/overview/components/bar-graph';
import { getConvexServerOptions } from '@/lib/convex-server';
import { api } from '@wabrix/backend/convex/_generated/api';
import { fetchQuery } from 'convex/nextjs';

export default async function BarStats() {
  const data = await fetchQuery(
    api.billing.getOverviewBarChartState,
    {},
    await getConvexServerOptions()
  );

  return <BarGraph data={data} />;
}
