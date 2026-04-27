"use client";

import { useQuery } from "convex/react";
import { api } from "@wabrix/backend/convex/_generated/api";

type AnalyticsClientProps = {
  copy: {
    loading: string;
    usage: string;
    queueMetrics: string;
    deliveryMetrics: string;
    recentAiRuns: string;
    aiTokens: string;
    outboundMessages: string;
    queued: string;
    processing: string;
    sent: string;
    failed: string;
    delivered: string;
    read: string;
    noRuns: string;
  };
};

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-stone-950">{value}</p>
    </div>
  );
}

export function AnalyticsClient({ copy }: AnalyticsClientProps) {
  const analytics = useQuery(api.billing.getAnalyticsDashboardState, {});

  if (analytics === undefined) {
    return (
      <section className="rounded-[1.75rem] border border-stone-300/70 bg-white p-6 text-sm text-stone-700">
        {copy.loading}
      </section>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="space-y-6 rounded-[1.75rem] border border-stone-300/70 bg-white p-6 shadow-[0_24px_70px_rgba(24,37,31,0.08)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
            {copy.usage}
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <MetricCard
              label={copy.aiTokens}
              value={`${analytics.usage.aiTokensUsed.toLocaleString()} / ${analytics.usage.aiTokensLimit.toLocaleString()}`}
            />
            <MetricCard
              label={copy.outboundMessages}
              value={`${analytics.usage.outboundMessagesUsed.toLocaleString()} / ${analytics.usage.outboundMessagesLimit.toLocaleString()}`}
            />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
            {copy.queueMetrics}
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <MetricCard label={copy.queued} value={analytics.queueMetrics.queued} />
            <MetricCard
              label={copy.processing}
              value={analytics.queueMetrics.processing}
            />
            <MetricCard label={copy.sent} value={analytics.queueMetrics.sent} />
            <MetricCard label={copy.failed} value={analytics.queueMetrics.failed} />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
            {copy.deliveryMetrics}
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <MetricCard label={copy.sent} value={analytics.deliveryMetrics.sent} />
            <MetricCard
              label={copy.delivered}
              value={analytics.deliveryMetrics.delivered}
            />
            <MetricCard label={copy.read} value={analytics.deliveryMetrics.read} />
            <MetricCard label={copy.failed} value={analytics.deliveryMetrics.failed} />
          </div>
        </div>
      </section>

      <section className="space-y-6 rounded-[1.75rem] border border-stone-300/70 bg-white p-6 shadow-[0_24px_70px_rgba(24,37,31,0.08)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
            {copy.recentAiRuns}
          </p>
          {analytics.recentAiRuns.length === 0 ? (
            <p className="mt-4 text-sm text-stone-600">{copy.noRuns}</p>
          ) : (
            <div className="mt-4 space-y-3">
              {analytics.recentAiRuns.map((run) => (
                <div
                  key={run.id}
                  className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700"
                >
                  <p className="font-medium text-stone-950">
                    {run.provider} · {run.model}
                  </p>
                  <p className="mt-1">{run.totalTokens.toLocaleString()} tokens</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
            7-day series
          </p>
          <div className="mt-4 space-y-3">
            {analytics.dailySeries.map((point) => (
              <div
                key={point.date}
                className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700"
              >
                <p className="font-medium text-stone-950">{point.date}</p>
                <p className="mt-1">
                  AI: {point.aiRuns} · Inbound: {point.inbound} · Outbound: {point.outbound}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
