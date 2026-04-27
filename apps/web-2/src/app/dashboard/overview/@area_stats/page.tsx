import { AreaGraph } from '@/features/overview/components/area-graph';
import { getConvexServerOptions } from '@/lib/convex-server';
import { api } from '@wabrix/backend/convex/_generated/api';
import { fetchQuery } from 'convex/nextjs';

export default async function AreaStats() {
  const data = await fetchQuery(
    api.billing.getOverviewAreaChartState,
    {},
    await getConvexServerOptions()
  );

  return <AreaGraph data={data} />;
}
