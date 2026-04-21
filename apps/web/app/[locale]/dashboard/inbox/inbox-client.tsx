"use client";

import { useQuery } from "convex/react";
import { api } from "@wabrix/backend/convex/_generated/api";

type InboxClientProps = {
  copy: {
    loading: string;
    empty: string;
    conversationList: string;
    recentMessages: string;
    mediaOps: string;
    noMessages: string;
    serviceWindow: string;
    lastInbound: string;
    noMedia: string;
    openStatus: string;
    closedStatus: string;
  };
};

function formatDate(value: number | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function InboxClient({ copy }: InboxClientProps) {
  const inboxState = useQuery(api.inbound.getInboxState, {});

  if (inboxState === undefined) {
    return <p className="text-sm text-stone-600">{copy.loading}</p>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-[1.75rem] border border-stone-300/70 bg-white/90 p-6 shadow-[0_24px_70px_rgba(24,37,31,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-stone-950">
            {copy.conversationList}
          </h2>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-stone-600">
            {inboxState.role}
          </span>
        </div>

        {inboxState.conversations.length === 0 ? (
          <p className="mt-6 text-sm leading-7 text-stone-600">{copy.empty}</p>
        ) : (
          <div className="mt-6 grid gap-4">
            {inboxState.conversations.map((conversation) => (
              <article
                key={conversation.id}
                className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-stone-950">
                      {conversation.profileName ?? conversation.waId ?? "Unknown"}
                    </h3>
                    <p className="mt-1 text-sm text-stone-600">
                      {conversation.waId ?? "No WA identity"}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-900">
                    {conversation.status === "open"
                      ? copy.openStatus
                      : copy.closedStatus}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-stone-700">
                  <p>
                    <span className="font-medium text-stone-950">
                      {copy.serviceWindow}:{" "}
                    </span>
                    {formatDate(conversation.serviceWindowExpiresAt)}
                  </p>
                  <p>
                    <span className="font-medium text-stone-950">
                      {copy.lastInbound}:{" "}
                    </span>
                    {formatDate(conversation.lastInboundAt)}
                  </p>
                  <p className="rounded-2xl bg-white px-4 py-3 text-stone-800">
                    {conversation.lastMessagePreview ?? copy.noMessages}
                  </p>
                </div>

                <div className="mt-5">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
                    {copy.recentMessages}
                  </h4>
                  {conversation.recentMessages.length === 0 ? (
                    <p className="mt-3 text-sm text-stone-600">{copy.noMessages}</p>
                  ) : (
                    <div className="mt-3 grid gap-3">
                      {conversation.recentMessages.map((message) => (
                        <div
                          key={message.id}
                          className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700"
                        >
                          <p className="font-medium capitalize text-stone-950">
                            {message.role} · {message.contentType}
                          </p>
                          <p className="mt-2 leading-7">{message.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[1.75rem] border border-stone-300/70 bg-[#111827] p-6 text-white shadow-[0_24px_70px_rgba(16,24,22,0.2)]">
        <h2 className="text-2xl font-semibold text-white">{copy.mediaOps}</h2>
        {inboxState.mediaRecords.length === 0 ? (
          <p className="mt-5 text-sm leading-7 text-stone-300">{copy.noMedia}</p>
        ) : (
          <div className="mt-5 grid gap-3">
            {inboxState.mediaRecords.map((record) => (
              <div
                key={record.id}
                className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-stone-100"
              >
                <p className="font-semibold uppercase tracking-[0.2em] text-cyan-300">
                  {record.mediaType}
                </p>
                <p className="mt-2 break-all">{record.providerMediaId}</p>
                <p className="mt-2 text-stone-300">
                  download: {record.downloadStatus}
                </p>
                <p className="text-stone-300">
                  transcript: {record.transcriptStatus}
                </p>
                <p className="text-stone-300">summary: {record.summaryStatus}</p>
                <p className="text-stone-300">storage: {record.storageStatus}</p>
                <p className="mt-2 text-xs text-stone-400">
                  deadline: {formatDate(record.downloadDeadlineAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
