import { RecentSales } from "@/features/overview/components/recent-sales";
import { getConvexServerOptions } from "@/lib/convex-server";
import { api } from "@wabrix/backend/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";

export default async function Sales() {
  const data = await fetchQuery(
    api.dashboard.getOverviewRecentMessagesState,
    {},
    await getConvexServerOptions(),
  );

  return <RecentSales data={data} />;
}
