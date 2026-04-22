"use client";

import React, { useDeferredValue, useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@wabrix/backend/convex/_generated/api";

type InboxClientProps = {
  translationLanguage: "en" | "id";
  copy: {
    loading: string;
    empty: string;
    conversationList: string;
    search: string;
    searchPlaceholder: string;
    sortBy: string;
    sortRecent: string;
    sortOldest: string;
    sortNeedsHuman: string;
    thread: string;
    threadEmpty: string;
    notes: string;
    notesEmpty: string;
    addNote: string;
    notePlaceholder: string;
    saveNote: string;
    noteSaved: string;
    serviceWindow: string;
    serviceWindowClosed: string;
    serviceWindowOpen: string;
    lastInbound: string;
    lastMessage: string;
    assignedTo: string;
    unassigned: string;
    assignPlaceholder: string;
    botReplyState: string;
    botReplyError: string;
    pauseBot: string;
    resumeBot: string;
    handoffOn: string;
    handoffOff: string;
    closeConversation: string;
    reopenConversation: string;
    deliveryStatus: string;
    composerLabel: string;
    composerPlaceholder: string;
    sendReply: string;
    sendPending: string;
    manualReplyQueued: string;
    freeformBlocked: string;
    templateFallback: string;
    templatePreview: string;
    translationToggle: string;
    translationHide: string;
    translating: string;
    translationError: string;
    queueOps: string;
    noQueue: string;
    notifications: string;
    noNotifications: string;
    lifecycle: string;
    approvalStatus: string;
    otpStatus: string;
    profileSyncStatus: string;
    connectionStatus: string;
    webhookStatus: string;
    phoneNumberId: string;
    businessAccountId: string;
    statusPending: string;
    statusApproved: string;
    statusConfigured: string;
    statusMissing: string;
    statusVerified: string;
    statusReceiving: string;
    statusSynced: string;
    openStatus: string;
    closedStatus: string;
    stateIdle: string;
    statePending: string;
    stateGenerating: string;
    stateQueued: string;
    stateBlocked: string;
    stateFailed: string;
    expiringSoon: string;
  };
};

type SortMode = "recent" | "oldest" | "needs_human";

function formatBotReplyState(
  state: string,
  copy: InboxClientProps["copy"],
) {
  switch (state) {
    case "idle":
      return copy.stateIdle;
    case "pending":
      return copy.statePending;
    case "generating":
      return copy.stateGenerating;
    case "queued":
      return copy.stateQueued;
    case "blocked":
      return copy.stateBlocked;
    case "failed":
      return copy.stateFailed;
    default:
      return state;
  }
}

function formatLifecycleValue(
  value: string,
  copy: InboxClientProps["copy"],
) {
  switch (value) {
    case "pending":
      return copy.statusPending;
    case "approved":
      return copy.statusApproved;
    case "configured":
      return copy.statusConfigured;
    case "missing":
      return copy.statusMissing;
    case "verified":
      return copy.statusVerified;
    case "receiving":
      return copy.statusReceiving;
    case "synced":
      return copy.statusSynced;
    default:
      return value;
  }
}

function formatDate(value: number | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function InboxClient({
  translationLanguage,
  copy,
}: InboxClientProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | undefined
  >(undefined);
  const [searchValue, setSearchValue] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [noteBody, setNoteBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [translationEnabled, setTranslationEnabled] = useState(false);
  const [translatedMessages, setTranslatedMessages] = useState<
    Record<string, string>
  >({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [templatePreview, setTemplatePreview] = useState<string | null>(null);

  const deferredSearchValue = useDeferredValue(searchValue);

  const workspace = useQuery(api.inbox.getInboxWorkspace, {
    selectedConversationId: selectedConversationId as never,
  });

  const setConversationBotPause = useMutation(api.inbox.setConversationBotPause);
  const setConversationHandoff = useMutation(api.inbox.setConversationHandoff);
  const assignConversation = useMutation(api.inbox.assignConversation);
  const setConversationStatus = useMutation(api.inbox.setConversationStatus);
  const addConversationNote = useMutation(api.inbox.addConversationNote);
  const sendManualReply = useMutation(api.inbox.sendManualReply);
  const translateInboxMessages = useAction(api.ai.translateInboxMessages);

  const selectedConversation = workspace?.selectedConversation ?? null;

  useEffect(() => {
    if (!selectedConversationId && workspace?.selectedConversation?.id) {
      setSelectedConversationId(workspace.selectedConversation.id);
    }
  }, [selectedConversationId, workspace?.selectedConversation?.id]);

  useEffect(() => {
    setTranslationEnabled(false);
    setTranslatedMessages({});
    setTemplatePreview(null);
    setReplyBody("");
    setNoteBody("");
  }, [selectedConversation?.id]);

  if (workspace === undefined) {
    return <p className="text-sm text-stone-600">{copy.loading}</p>;
  }

  const filteredConversations = workspace.conversations
    .filter((conversation) => {
      const haystack = [
        conversation.profileName,
        conversation.waId,
        conversation.assignedUserName,
        conversation.lastMessagePreview,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(deferredSearchValue.trim().toLowerCase());
    })
    .sort((left, right) => {
      if (sortMode === "oldest") {
        return left.lastMessageAt - right.lastMessageAt;
      }

      if (sortMode === "needs_human") {
        const leftRank =
          Number(left.handoffRequested) * 4 +
          Number(left.botPaused) * 3 +
          Number(left.serviceWindowExpiringSoon) * 2 +
          Number(left.botReplyState === "failed");
        const rightRank =
          Number(right.handoffRequested) * 4 +
          Number(right.botPaused) * 3 +
          Number(right.serviceWindowExpiringSoon) * 2 +
          Number(right.botReplyState === "failed");

        return rightRank - leftRank || right.lastMessageAt - left.lastMessageAt;
      }

      return right.lastMessageAt - left.lastMessageAt;
    });

  async function handleTranslationToggle() {
    if (!selectedConversation) {
      return;
    }

    if (translationEnabled) {
      setTranslationEnabled(false);
      return;
    }

    if (Object.keys(translatedMessages).length === 0) {
      setIsTranslating(true);
      try {
        const result = await translateInboxMessages({
          messages: selectedConversation.messages.map((message) => ({
            id: message.id,
            content: message.content,
          })),
          targetLanguage: translationLanguage,
        });

        const nextTranslations = Object.fromEntries(
          result.translations.map((translation) => [
            translation.id,
            translation.translatedContent,
          ]),
        );
        setTranslatedMessages(nextTranslations);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : copy.translationError,
        );
        return;
      } finally {
        setIsTranslating(false);
      }
    }

    setTranslationEnabled(true);
  }

  async function handlePauseToggle() {
    if (!selectedConversation) {
      return;
    }

    await setConversationBotPause({
      conversationId: selectedConversation.id as never,
      botPaused: !selectedConversation.botPaused,
    });
  }

  async function handleHandoffToggle() {
    if (!selectedConversation) {
      return;
    }

    await setConversationHandoff({
      conversationId: selectedConversation.id as never,
      handoffRequested: !selectedConversation.handoffRequested,
    });
  }

  async function handleStatusToggle() {
    if (!selectedConversation) {
      return;
    }

    await setConversationStatus({
      conversationId: selectedConversation.id as never,
      status: selectedConversation.status === "open" ? "closed" : "open",
    });
  }

  async function handleAssignmentChange(value: string) {
    if (!selectedConversation) {
      return;
    }

    await assignConversation({
      conversationId: selectedConversation.id as never,
      assignedUserId: value ? (value as never) : undefined,
    });
  }

  async function handleSaveNote() {
    if (!selectedConversation || !noteBody.trim()) {
      return;
    }

    setIsSavingNote(true);
    try {
      await addConversationNote({
        conversationId: selectedConversation.id as never,
        body: noteBody.trim(),
      });
      setNoteBody("");
      toast.success(copy.noteSaved);
    } finally {
      setIsSavingNote(false);
    }
  }

  async function handleSendReply() {
    if (!selectedConversation || !replyBody.trim()) {
      return;
    }

    setIsSendingReply(true);
    try {
      await sendManualReply({
        conversationId: selectedConversation.id as never,
        body: replyBody.trim(),
      });
      setReplyBody("");
      toast.success(copy.manualReplyQueued);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.freeformBlocked);
    } finally {
      setIsSendingReply(false);
    }
  }

  const composerDisabled =
    !selectedConversation ||
    selectedConversation.status !== "open" ||
    !selectedConversation.serviceWindowOpen;

  return (
    <div
      data-testid="inbox-workspace"
      className="grid gap-5 xl:grid-cols-[minmax(18rem,23rem)_minmax(0,1fr)_minmax(19rem,23rem)]"
    >
      <section
        className="rounded-[1.75rem] border border-stone-300/70 bg-white/90 p-5 shadow-[0_24px_70px_rgba(24,37,31,0.08)]"
        style={{ resize: "horizontal", overflow: "auto" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-stone-950">
              {copy.conversationList}
            </h2>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-500">
              {workspace.role}
            </p>
          </div>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
            {filteredConversations.length}
          </span>
        </div>

        <div className="mt-5 grid gap-3">
          <label className="grid gap-2 text-sm text-stone-700">
            <span className="font-medium text-stone-900">{copy.search}</span>
            <input
              aria-label={copy.search}
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none ring-0 transition focus:border-emerald-500"
            />
          </label>

          <label className="grid gap-2 text-sm text-stone-700">
            <span className="font-medium text-stone-900">{copy.sortBy}</span>
            <select
              aria-label={copy.sortBy}
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
            >
              <option value="recent">{copy.sortRecent}</option>
              <option value="oldest">{copy.sortOldest}</option>
              <option value="needs_human">{copy.sortNeedsHuman}</option>
            </select>
          </label>
        </div>

        {filteredConversations.length === 0 ? (
          <p className="mt-6 text-sm leading-7 text-stone-600">{copy.empty}</p>
        ) : (
          <div className="mt-5 overflow-hidden rounded-[1.4rem] border border-stone-200">
            <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
              <thead className="bg-stone-100 text-stone-600">
                <tr>
                  <th className="px-4 py-3 font-medium">{copy.conversationList}</th>
                  <th className="px-4 py-3 font-medium">{copy.assignedTo}</th>
                  <th className="px-4 py-3 font-medium">{copy.lastMessage}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {filteredConversations.map((conversation) => (
                  <tr
                    key={conversation.id}
                    data-testid={`conversation-row-${conversation.id}`}
                    className={
                      conversation.id === selectedConversation?.id
                        ? "bg-emerald-50"
                        : "hover:bg-stone-50"
                    }
                  >
                    <td className="px-4 py-4 align-top">
                      <button
                        type="button"
                        onClick={() => setSelectedConversationId(conversation.id)}
                        className="grid w-full gap-1 text-left"
                      >
                        <span className="font-semibold text-stone-950">
                          {conversation.profileName ?? conversation.waId ?? "Unknown"}
                        </span>
                        <span className="text-xs uppercase tracking-[0.16em] text-stone-500">
                          {conversation.channelLabel}
                        </span>
                        <span className="text-xs text-stone-500">
                          {conversation.waId ?? "No WA identity"}
                        </span>
                        {conversation.serviceWindowExpiringSoon ? (
                          <span className="text-xs text-amber-700">
                            {copy.expiringSoon}
                          </span>
                        ) : null}
                      </button>
                    </td>
                    <td className="px-4 py-4 align-top text-stone-600">
                      {conversation.assignedUserName ?? copy.unassigned}
                    </td>
                    <td className="px-4 py-4 align-top text-stone-600">
                      <p className="max-w-[16rem] truncate">
                        {conversation.lastMessagePreview ?? "—"}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        {formatDate(conversation.lastMessageAt)}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-[1.75rem] border border-stone-300/70 bg-[#0f1c1b] p-5 text-white shadow-[0_24px_70px_rgba(16,24,22,0.2)]">
        {!selectedConversation ? (
          <p className="text-sm leading-7 text-stone-300">{copy.threadEmpty}</p>
        ) : (
          <div className="grid gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">
                  {selectedConversation.channelLabel}
                </p>
                <h2 className="mt-2 text-3xl font-semibold">
                  {selectedConversation.profileName ??
                    selectedConversation.waId ??
                    "Unknown"}
                </h2>
                <p className="mt-1 text-sm text-stone-300">
                  {selectedConversation.waId ?? "No WA identity"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleTranslationToggle}
                  disabled={isTranslating}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-stone-100 transition hover:bg-white/5 disabled:opacity-60"
                >
                  {isTranslating
                    ? copy.translating
                    : translationEnabled
                      ? copy.translationHide
                      : copy.translationToggle}
                </button>
                <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-stone-100">
                  {selectedConversation.status === "open"
                    ? copy.openStatus
                    : copy.closedStatus}
                </span>
              </div>
            </div>

            <div className="grid gap-2 rounded-[1.4rem] border border-white/10 bg-white/5 p-4 text-sm text-stone-200">
              <p>
                <span className="font-medium text-white">{copy.serviceWindow}: </span>
                {formatDate(selectedConversation.serviceWindowExpiresAt)}
              </p>
              <p>
                <span className="font-medium text-white">{copy.lastInbound}: </span>
                {formatDate(selectedConversation.lastInboundAt)}
              </p>
              <p>
                <span className="font-medium text-white">{copy.botReplyState}: </span>
                {formatBotReplyState(selectedConversation.botReplyState, copy)}
              </p>
              <p>
                <span className="font-medium text-white">{copy.deliveryStatus}: </span>
                {selectedConversation.serviceWindowOpen
                  ? copy.serviceWindowOpen
                  : copy.serviceWindowClosed}
              </p>
              {selectedConversation.botReplyError ? (
                <p className="text-rose-300">
                  <span className="font-medium text-rose-200">
                    {copy.botReplyError}:{" "}
                  </span>
                  {selectedConversation.botReplyError}
                </p>
              ) : null}
              {selectedConversation.serviceWindowExpiringSoon ? (
                <p className="text-amber-300">{copy.expiringSoon}</p>
              ) : null}
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">{copy.thread}</h3>
                <span className="text-xs uppercase tracking-[0.2em] text-stone-400">
                  {selectedConversation.messages.length}
                </span>
              </div>

              <div className="grid max-h-[34rem] gap-3 overflow-y-auto pr-1">
                {selectedConversation.messages.map((message) => {
                  const translatedContent = translatedMessages[message.id];
                  const displayContent =
                    translationEnabled && translatedContent
                      ? translatedContent
                      : message.content;

                  return (
                    <article
                      key={message.id}
                      className={
                        message.role === "user"
                          ? "mr-10 rounded-[1.35rem] border border-white/10 bg-white/10 p-4"
                          : "ml-10 rounded-[1.35rem] border border-emerald-400/20 bg-emerald-500/10 p-4"
                      }
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.18em] text-stone-300">
                        <span>
                          {message.role} · {message.contentType}
                        </span>
                        <span>{message.deliveryState}</span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap leading-7 text-stone-100">
                        {displayContent}
                      </p>
                      {translationEnabled && translatedContent ? (
                        <p className="mt-3 text-xs text-stone-300">
                          original: {message.content}
                        </p>
                      ) : null}
                      <p className="mt-3 text-xs text-stone-400">
                        {formatDate(message.createdAt)}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{copy.composerLabel}</h3>
                  <p className="mt-1 text-sm text-stone-300">
                    {composerDisabled ? copy.freeformBlocked : copy.serviceWindowOpen}
                  </p>
                </div>
              </div>

              {!selectedConversation.serviceWindowOpen ? (
                <div className="mt-4 grid gap-3 rounded-[1.2rem] border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                  <p className="font-medium">{copy.templateFallback}</p>
                  <div className="flex flex-wrap gap-2">
                    {workspace.templateSuggestions.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setTemplatePreview(template.body)}
                        className="rounded-full border border-amber-200/20 px-3 py-2 text-xs uppercase tracking-[0.16em] transition hover:bg-amber-200/10"
                      >
                        {template.language} · {template.title}
                      </button>
                    ))}
                  </div>
                  {templatePreview ? (
                    <p className="rounded-2xl bg-black/20 px-4 py-3 text-amber-50">
                      <span className="font-medium">{copy.templatePreview}: </span>
                      {templatePreview}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <textarea
                aria-label={copy.composerLabel}
                value={replyBody}
                onChange={(event) => setReplyBody(event.target.value)}
                placeholder={copy.composerPlaceholder}
                disabled={composerDisabled || isSendingReply}
                className="mt-4 min-h-32 w-full rounded-[1.2rem] border border-white/10 bg-[#08100f] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              />

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleSendReply}
                  disabled={composerDisabled || isSendingReply || !replyBody.trim()}
                  className="rounded-full bg-emerald-300 px-5 py-2 text-sm font-medium text-[#0b1614] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSendingReply ? copy.sendPending : copy.sendReply}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section
        className="rounded-[1.75rem] border border-stone-300/70 bg-white/90 p-5 shadow-[0_24px_70px_rgba(24,37,31,0.08)]"
        style={{ resize: "horizontal", overflow: "auto" }}
      >
        {!selectedConversation ? (
          <p className="text-sm leading-7 text-stone-600">{copy.threadEmpty}</p>
        ) : (
          <div className="grid gap-6">
            <div className="grid gap-3 rounded-[1.4rem] border border-stone-200 bg-stone-50 p-4">
              <h3 className="text-lg font-semibold text-stone-950">
                {copy.assignedTo}
              </h3>
              <label className="grid gap-2 text-sm text-stone-700">
                <span>{copy.assignPlaceholder}</span>
                <select
                  aria-label={copy.assignedTo}
                  value={selectedConversation.assignedUserId ?? ""}
                  onChange={(event) => handleAssignmentChange(event.target.value)}
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
                >
                  <option value="">{copy.unassigned}</option>
                  {workspace.teamMembers.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.displayName} · {member.role}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handlePauseToggle}
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-900 transition hover:border-emerald-500"
                >
                  {selectedConversation.botPaused ? copy.resumeBot : copy.pauseBot}
                </button>
                <button
                  type="button"
                  onClick={handleHandoffToggle}
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-900 transition hover:border-emerald-500"
                >
                  {selectedConversation.handoffRequested
                    ? copy.handoffOff
                    : copy.handoffOn}
                </button>
                <button
                  type="button"
                  onClick={handleStatusToggle}
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-900 transition hover:border-emerald-500 sm:col-span-2"
                >
                  {selectedConversation.status === "open"
                    ? copy.closeConversation
                    : copy.reopenConversation}
                </button>
              </div>
            </div>

            <div className="grid gap-3 rounded-[1.4rem] border border-stone-200 bg-stone-50 p-4">
              <h3 className="text-lg font-semibold text-stone-950">
                {copy.lifecycle}
              </h3>
              <p className="text-sm text-stone-700">
                {copy.connectionStatus}:{" "}
                <span className="font-medium">
                  {formatLifecycleValue(workspace.wabaLifecycle.connectionStatus, copy)}
                </span>
              </p>
              <p className="text-sm text-stone-700">
                {copy.webhookStatus}:{" "}
                <span className="font-medium">
                  {formatLifecycleValue(workspace.wabaLifecycle.webhookStatus, copy)}
                </span>
              </p>
              <p className="text-sm text-stone-700">
                {copy.approvalStatus}:{" "}
                <span className="font-medium">
                  {formatLifecycleValue(workspace.wabaLifecycle.approvalStatus, copy)}
                </span>
              </p>
              <p className="text-sm text-stone-700">
                {copy.otpStatus}:{" "}
                <span className="font-medium">
                  {formatLifecycleValue(workspace.wabaLifecycle.otpStatus, copy)}
                </span>
              </p>
              <p className="text-sm text-stone-700">
                {copy.profileSyncStatus}:{" "}
                <span className="font-medium">
                  {formatLifecycleValue(workspace.wabaLifecycle.profileSyncStatus, copy)}
                </span>
              </p>
              <p className="text-sm text-stone-700">
                {copy.phoneNumberId}:{" "}
                <span className="font-medium">
                  {workspace.wabaLifecycle.phoneNumberId ?? "—"}
                </span>
              </p>
              <p className="text-sm text-stone-700">
                {copy.businessAccountId}:{" "}
                <span className="font-medium">
                  {workspace.wabaLifecycle.businessAccountId ?? "—"}
                </span>
              </p>
            </div>

            <div className="grid gap-3 rounded-[1.4rem] border border-stone-200 bg-stone-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-stone-950">{copy.notes}</h3>
                <span className="text-xs uppercase tracking-[0.16em] text-stone-500">
                  {selectedConversation.notes.length}
                </span>
              </div>

              {selectedConversation.notes.length === 0 ? (
                <p className="text-sm text-stone-600">{copy.notesEmpty}</p>
              ) : (
                <div className="grid gap-3">
                  {selectedConversation.notes.map((note) => (
                    <article
                      key={note.id}
                      className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700"
                    >
                      <p className="font-medium text-stone-950">
                        {note.authorDisplayName}
                      </p>
                      <p className="mt-2 leading-7">{note.body}</p>
                      <p className="mt-2 text-xs text-stone-500">
                        {formatDate(note.createdAt)}
                      </p>
                    </article>
                  ))}
                </div>
              )}

              <textarea
                aria-label={copy.addNote}
                value={noteBody}
                onChange={(event) => setNoteBody(event.target.value)}
                placeholder={copy.notePlaceholder}
                className="min-h-28 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={isSavingNote || !noteBody.trim()}
                className="rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingNote ? copy.saveNote : copy.saveNote}
              </button>
            </div>

            <div className="grid gap-3 rounded-[1.4rem] border border-stone-200 bg-stone-50 p-4">
              <h3 className="text-lg font-semibold text-stone-950">{copy.queueOps}</h3>
              {selectedConversation.queue.length === 0 ? (
                <p className="text-sm text-stone-600">{copy.noQueue}</p>
              ) : (
                <div className="grid gap-3">
                  {selectedConversation.queue.map((job) => (
                    <article
                      key={job.id}
                      className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700"
                    >
                      <p className="font-medium uppercase tracking-[0.16em] text-stone-950">
                        {job.status}
                      </p>
                      <p className="mt-2">attempts: {job.attemptCount}</p>
                      <p>next attempt: {formatDate(job.nextAttemptAt)}</p>
                      {job.providerMessageId ? (
                        <p className="mt-2 break-all text-xs text-stone-500">
                          provider: {job.providerMessageId}
                        </p>
                      ) : null}
                      {job.failureMessage ? (
                        <p className="mt-2 text-rose-700">{job.failureMessage}</p>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-3 rounded-[1.4rem] border border-stone-200 bg-stone-50 p-4">
              <h3 className="text-lg font-semibold text-stone-950">
                {copy.notifications}
              </h3>
              {selectedConversation.notifications.length === 0 ? (
                <p className="text-sm text-stone-600">{copy.noNotifications}</p>
              ) : (
                <div className="grid gap-3">
                  {selectedConversation.notifications.map((notification) => (
                    <article
                      key={notification.id}
                      className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700"
                    >
                      <p className="font-medium uppercase tracking-[0.16em] text-stone-950">
                        {notification.type}
                      </p>
                      <p className="mt-2 font-medium">{notification.title}</p>
                      <p className="mt-2 leading-7">{notification.body}</p>
                      {notification.recommendation ? (
                        <p className="mt-2 text-stone-500">
                          {notification.recommendation}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
