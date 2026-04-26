"use client";

import { BellRingIcon, Clock3Icon, SparklesIcon, UserRoundIcon, WorkflowIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type {
  ChatCopy,
  ConversationDetails,
  TeamMember,
  TemplateSuggestion,
  WabaLifecycle,
} from "../utils/types";

interface ConversationDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: ConversationDetails | null;
  teamMembers: TeamMember[];
  templates: TemplateSuggestion[];
  lifecycle: WabaLifecycle | null;
  noteBody: string;
  onNoteBodyChange: (value: string) => void;
  onSaveNote: () => Promise<void>;
  onAssignmentChange: (value: string) => Promise<void>;
  onPauseToggle: () => Promise<void>;
  onHandoffToggle: () => Promise<void>;
  onStatusToggle: () => Promise<void>;
  onTranslationToggle: () => Promise<void>;
  translationEnabled: boolean;
  isTranslating: boolean;
  isSavingNote: boolean;
  isSendingReply: boolean;
  selectedTemplateId: string | null;
  onTemplateSelect: (value: string) => void;
  onSendTemplate: () => Promise<void>;
  copy: ChatCopy;
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

function formatLifecycleValue(value: string, copy: ChatCopy) {
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

function formatBotReplyState(state: string, copy: ChatCopy) {
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

export function ConversationDetailsDrawer({
  open,
  onOpenChange,
  conversation,
  teamMembers,
  templates,
  lifecycle,
  noteBody,
  onNoteBodyChange,
  onSaveNote,
  onAssignmentChange,
  onPauseToggle,
  onHandoffToggle,
  onStatusToggle,
  onTranslationToggle,
  translationEnabled,
  isTranslating,
  isSavingNote,
  isSendingReply,
  selectedTemplateId,
  onTemplateSelect,
  onSendTemplate,
  copy,
}: ConversationDetailsDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="border-border/50 bg-background/95 flex h-full w-full flex-col gap-0 p-0 shadow-2xl supports-backdrop-filter:backdrop-blur-xl sm:max-w-md"
      >
        <SheetHeader className="border-b border-border/50 px-5 py-4">
          <SheetTitle>{conversation?.name ?? "Conversation"}</SheetTitle>
          <SheetDescription>
            {conversation ? `${conversation.title} · ${conversation.waId ?? "No WA identity"}` : copy.threadEmpty}
          </SheetDescription>
        </SheetHeader>

        {!conversation ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
            {copy.threadEmpty}
          </div>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 p-4">
              <section className="rounded-3xl border border-border/60 bg-background/70 p-4">
                <div className="flex items-center gap-2">
                  <UserRoundIcon className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">
                    {copy.assignedTo}
                  </h3>
                </div>

                <label className="mt-4 grid gap-2 text-sm text-foreground">
                  <span className="font-medium">{copy.assignPlaceholder}</span>
                  <select
                    aria-label={copy.assignedTo}
                    value={conversation.assignedUserId ?? ""}
                    onChange={(event) => void onAssignmentChange(event.target.value)}
                    className="h-11 rounded-2xl border border-input bg-background/80 px-3 text-sm outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/50"
                  >
                    <option value="">{copy.unassigned}</option>
                    {teamMembers.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.displayName} · {member.role}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="mt-4 grid gap-2">
                  <Button type="button" variant="outline" onClick={() => void onPauseToggle()}>
                    {conversation.botPaused ? copy.resumeBot : copy.pauseBot}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void onHandoffToggle()}>
                    {conversation.handoffRequested ? copy.handoffOff : copy.handoffOn}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void onStatusToggle()}>
                    {conversation.rawStatus === "open" ? copy.closeConversation : copy.reopenConversation}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void onTranslationToggle()}
                    disabled={isTranslating}
                  >
                    {isTranslating
                      ? copy.translating
                      : translationEnabled
                        ? copy.translationHide
                        : copy.translationToggle}
                  </Button>
                </div>
              </section>

              <section className="rounded-3xl border border-border/60 bg-background/70 p-4">
                <div className="grid gap-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{copy.serviceWindow}</span>
                    <Badge variant="outline">{formatDate(conversation.serviceWindowExpiresAt)}</Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{copy.lastInbound}</span>
                    <Badge variant="outline">{formatDate(conversation.lastInboundAt)}</Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{copy.botReplyState}</span>
                    <Badge variant="outline">{formatBotReplyState(conversation.botReplyState, copy)}</Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="outline">
                      {conversation.rawStatus === "open" ? copy.openStatus : copy.closedStatus}
                    </Badge>
                  </div>
                </div>
                {conversation.serviceWindowExpiringSoon ? (
                  <p className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-100">
                    {copy.expiringSoon}
                  </p>
                ) : null}
                {conversation.optOut ? (
                  <p className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">
                    {copy.optedOut}
                  </p>
                ) : null}
                {conversation.botReplyError ? (
                  <p className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">
                    <span className="font-medium">{copy.botReplyError}: </span>
                    {conversation.botReplyError}
                  </p>
                ) : null}
              </section>

              <section className="rounded-3xl border border-border/60 bg-background/70 p-4">
                <div className="flex items-center gap-2">
                  <WorkflowIcon className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">
                    {copy.lifecycle}
                  </h3>
                </div>

                {lifecycle ? (
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">{copy.connectionStatus}</span>
                      <Badge variant="outline">
                        {formatLifecycleValue(lifecycle.connectionStatus, copy)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">{copy.webhookStatus}</span>
                      <Badge variant="outline">
                        {formatLifecycleValue(lifecycle.webhookStatus, copy)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">{copy.approvalStatus}</span>
                      <Badge variant="outline">
                        {formatLifecycleValue(lifecycle.approvalStatus, copy)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">{copy.otpStatus}</span>
                      <Badge variant="outline">{formatLifecycleValue(lifecycle.otpStatus, copy)}</Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">{copy.profileSyncStatus}</span>
                      <Badge variant="outline">
                        {formatLifecycleValue(lifecycle.profileSyncStatus, copy)}
                      </Badge>
                    </div>
                    <div className="rounded-2xl border border-dashed border-border/70 px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {copy.phoneNumberId}
                      </p>
                      <p className="mt-1 break-all text-sm text-foreground">
                        {lifecycle.phoneNumberId ?? "—"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-dashed border-border/70 px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {copy.businessAccountId}
                      </p>
                      <p className="mt-1 break-all text-sm text-foreground">
                        {lifecycle.businessAccountId ?? "—"}
                      </p>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="rounded-3xl border border-border/60 bg-background/70 p-4">
                <div className="flex items-center gap-2">
                  <Clock3Icon className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">
                    {copy.templateFallback}
                  </h3>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => onTemplateSelect(template.id)}
                      className={
                        selectedTemplateId === template.id
                          ? "rounded-full border border-amber-500/40 bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-950 transition dark:text-amber-50"
                          : "rounded-full border border-amber-500/20 bg-transparent px-3 py-1.5 text-xs font-medium text-amber-800 transition hover:bg-amber-500/10 dark:text-amber-100"
                      }
                    >
                      {template.language} · {template.title}
                    </button>
                  ))}
                </div>

                {selectedTemplateId ? (
                  <p className="mt-3 rounded-2xl bg-background/70 px-4 py-3 text-sm text-foreground">
                    <span className="font-medium">{copy.templatePreview}: </span>
                    {templates.find((template) => template.id === selectedTemplateId)?.body ?? ""}
                  </p>
                ) : null}

                <Button
                  type="button"
                  onClick={() => void onSendTemplate()}
                  disabled={isSendingReply || !selectedTemplateId}
                  className="mt-4 w-full rounded-full"
                >
                  {isSendingReply ? copy.sendPending : copy.sendTemplate}
                </Button>
              </section>

              <section className="rounded-3xl border border-border/60 bg-background/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="size-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold tracking-tight text-foreground">
                      {copy.notes}
                    </h3>
                  </div>
                  <Badge variant="outline">{conversation.notes.length}</Badge>
                </div>

                <div className="mt-4 space-y-3">
                  {conversation.notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{copy.notesEmpty}</p>
                  ) : (
                    conversation.notes.map((note) => (
                      <article
                        key={note.id}
                        className="rounded-2xl border border-border/60 bg-background/90 px-4 py-3"
                      >
                        <p className="text-sm font-medium text-foreground">{note.authorDisplayName}</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{note.body}</p>
                        <p className="mt-2 text-xs text-muted-foreground">{formatDate(note.createdAt)}</p>
                      </article>
                    ))
                  )}
                </div>

                <Textarea
                  aria-label={copy.addNote}
                  value={noteBody}
                  onChange={(event) => onNoteBodyChange(event.target.value)}
                  placeholder={copy.notePlaceholder}
                  className="mt-4 min-h-24 rounded-2xl border-border/60 bg-background/80"
                />
                <Button
                  type="button"
                  onClick={() => void onSaveNote()}
                  disabled={isSavingNote || !noteBody.trim()}
                  className="mt-3 w-full rounded-full"
                >
                  {copy.saveNote}
                </Button>
              </section>

              <section className="rounded-3xl border border-border/60 bg-background/70 p-4">
                <div className="flex items-center gap-2">
                  <Clock3Icon className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">
                    {copy.queueOps}
                  </h3>
                </div>

                <div className="mt-4 space-y-3">
                  {conversation.queue.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{copy.noQueue}</p>
                  ) : (
                    conversation.queue.map((job) => (
                      <article
                        key={job.id}
                        className="rounded-2xl border border-border/60 bg-background/90 px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium uppercase tracking-[0.16em] text-foreground">
                            {job.status}
                          </p>
                          <Badge variant="outline">{job.payloadType}</Badge>
                        </div>
                        {job.templateName ? (
                          <p className="mt-2 text-sm text-muted-foreground">
                            template: {job.templateName}
                          </p>
                        ) : null}
                        <p className="mt-2 text-sm text-muted-foreground">attempts: {job.attemptCount}</p>
                        <p className="text-sm text-muted-foreground">
                          next attempt: {formatDate(job.nextAttemptAt)}
                        </p>
                        {job.providerMessageId ? (
                          <p className="mt-2 break-all text-xs text-muted-foreground">
                            provider: {job.providerMessageId}
                          </p>
                        ) : null}
                        {job.failureMessage ? (
                          <p className="mt-2 text-sm text-rose-700 dark:text-rose-200">
                            {job.failureMessage}
                          </p>
                        ) : null}
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-border/60 bg-background/70 p-4">
                <div className="flex items-center gap-2">
                  <BellRingIcon className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">
                    {copy.notifications}
                  </h3>
                </div>

                <div className="mt-4 space-y-3">
                  {conversation.notifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{copy.noNotifications}</p>
                  ) : (
                    conversation.notifications.map((notification) => (
                      <article
                        key={notification.id}
                        className="rounded-2xl border border-border/60 bg-background/90 px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium uppercase tracking-[0.16em] text-foreground">
                            {notification.type}
                          </p>
                          <Badge variant="outline">{notification.status}</Badge>
                        </div>
                        <p className="mt-2 text-sm font-medium text-foreground">{notification.title}</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{notification.body}</p>
                        {notification.recommendation ? (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {notification.recommendation}
                          </p>
                        ) : null}
                      </article>
                    ))
                  )}
                </div>
              </section>
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
