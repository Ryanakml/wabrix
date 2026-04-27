import { PieGraph } from '@/features/overview/components/pie-graph';
import { getConvexServerOptions } from '@/lib/convex-server';
import { api } from '@wabrix/backend/convex/_generated/api';
import { fetchQuery } from 'convex/nextjs';

export default async function Stats() {
  const data = await fetchQuery(
    api.billing.getOverviewPieChartState,
    {},
    await getConvexServerOptions()
  );

  return <PieGraph data={data} />;
}
