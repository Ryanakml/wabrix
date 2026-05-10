"use client";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { formatBotErrorText } from "@/lib/bot-error";
import type { Conversation, ConversationDetails } from "../utils/types";

interface ConversationDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation | null;
  details: ConversationDetails | null;
  isLoading: boolean;
  noteBody: string;
  onNoteBodyChange: (value: string) => void;
  onSaveNote: () => void;
  onAssignmentChange: (value: string) => void;
  onPauseToggle: () => void;
  onHandoffToggle: () => void;
  onStatusToggle: () => void;
  isSavingNote: boolean;
  isUpdatingConversation: boolean;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border/50 bg-background/60 space-y-3 rounded-2xl border p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 text-sm">
      <span className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
        {label}
      </span>
      <span>{value}</span>
    </div>
  );
}

export function ConversationDetailsDrawer({
  open,
  onOpenChange,
  conversation,
  details,
  isLoading,
  noteBody,
  onNoteBodyChange,
  onSaveNote,
  onAssignmentChange,
  onPauseToggle,
  onHandoffToggle,
  onStatusToggle,
  isSavingNote,
  isUpdatingConversation,
}: ConversationDetailsDrawerProps) {
  const selectedConversation = details?.selectedConversation ?? null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-md">
        <DrawerHeader className="border-border/50 border-b px-5 py-4">
          <DrawerTitle>
            {conversation
              ? `${conversation.name} details`
              : "Conversation details"}
          </DrawerTitle>
          <DrawerDescription>
            Operational metadata and actions are kept here to preserve a clean
            message thread.
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">
              Loading conversation details…
            </p>
          ) : !selectedConversation ? (
            <p className="text-muted-foreground text-sm">
              Select a conversation to view details.
            </p>
          ) : (
            <>
              <Section title="Conversation Metadata">
                <Row
                  label="Service Window"
                  value={
                    selectedConversation.serviceWindowOpen ? "Open" : "Closed"
                  }
                />
                <Row
                  label="Reply Policy"
                  value={
                    selectedConversation.replyPolicy === "freeform"
                      ? "Freeform replies allowed"
                      : "Template-only replies"
                  }
                />
                <Row
                  label="Service Window Expires"
                  value={
                    selectedConversation.serviceWindowExpiresAt ??
                    "Not available"
                  }
                />
                <Row
                  label="Last Inbound"
                  value={selectedConversation.lastInboundAt}
                />
                <Row
                  label="Last Message"
                  value={selectedConversation.lastMessageAt}
                />
              </Section>

              <Section title="Bot State & Errors">
                <Row
                  label="Bot Reply State"
                  value={selectedConversation.botReplyState}
                />
                <Row
                  label="Bot Paused"
                  value={selectedConversation.botPaused ? "Yes" : "No"}
                />
                <Row
                  label="Bot Error"
                  value={
                    selectedConversation.botReplyError ? (
                      <span className="whitespace-pre-wrap">
                        {formatBotErrorText(selectedConversation.botReplyError)}
                      </span>
                    ) : (
                      "No active bot errors"
                    )
                  }
                />
              </Section>

              <Section title="Assignment & Actions">
                <label className="grid gap-2 text-sm">
                  <span className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
                    Assigned Agent
                  </span>
                  <select
                    value={selectedConversation.assignedUserId ?? ""}
                    onChange={(event) => onAssignmentChange(event.target.value)}
                    disabled={isUpdatingConversation}
                    className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 min-h-10 rounded-xl border px-3 py-2 outline-none focus-visible:ring-[3px] disabled:opacity-50"
                  >
                    <option value="">Unassigned</option>
                    {details?.teamMembers.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.displayName} · {member.role}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onPauseToggle}
                    isLoading={isUpdatingConversation}
                  >
                    {selectedConversation.botPaused
                      ? "Resume Bot"
                      : "Pause Bot"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onHandoffToggle}
                    isLoading={isUpdatingConversation}
                  >
                    {selectedConversation.handoffRequested
                      ? "Clear Handoff"
                      : "Request Handoff"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onStatusToggle}
                    isLoading={isUpdatingConversation}
                    className="sm:col-span-2"
                  >
                    {selectedConversation.status === "open"
                      ? "Close Conversation"
                      : "Reopen Conversation"}
                  </Button>
                </div>
              </Section>

              <Section title="WABA Lifecycle">
                <Row
                  label="Connection"
                  value={details?.wabaLifecycle.connectionStatus ?? "Unknown"}
                />
                <Row
                  label="Webhook"
                  value={details?.wabaLifecycle.webhookStatus ?? "Unknown"}
                />
                <Row
                  label="Approval"
                  value={details?.wabaLifecycle.approvalStatus ?? "Unknown"}
                />
                <Row
                  label="OTP"
                  value={details?.wabaLifecycle.otpStatus ?? "Unknown"}
                />
                <Row
                  label="Profile Sync"
                  value={details?.wabaLifecycle.profileSyncStatus ?? "Unknown"}
                />
                <Row
                  label="Phone Number ID"
                  value={
                    details?.wabaLifecycle.phoneNumberId ?? "Not available"
                  }
                />
                <Row
                  label="Business Account ID"
                  value={
                    details?.wabaLifecycle.businessAccountId ?? "Not available"
                  }
                />
              </Section>

              <Section title="Internal Notes">
                <div className="space-y-3">
                  <Textarea
                    value={noteBody}
                    onChange={(event) => onNoteBodyChange(event.target.value)}
                    placeholder="Add an internal note"
                    className="min-h-24"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={onSaveNote}
                      isLoading={isSavingNote}
                      disabled={!noteBody.trim()}
                    >
                      Save Note
                    </Button>
                  </div>
                </div>

                {selectedConversation.notes.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No internal notes yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedConversation.notes.map((note) => (
                      <div
                        key={note.id}
                        className="bg-muted/40 rounded-xl p-3 text-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">
                            {note.authorDisplayName}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {note.createdAt}
                          </span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap">{note.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title="Outbound Queue">
                {selectedConversation.queue.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No queued outbound jobs.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedConversation.queue.map((job) => (
                      <div
                        key={job.id}
                        className="bg-muted/40 rounded-xl p-3 text-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{job.status}</span>
                          <span className="text-muted-foreground text-xs">
                            {job.createdAt}
                          </span>
                        </div>
                        <div className="mt-2 grid gap-2">
                          <Row label="Payload Type" value={job.payloadType} />
                          <Row label="Attempts" value={job.attemptCount} />
                          <Row label="Next Attempt" value={job.nextAttemptAt} />
                          <Row
                            label="Template"
                            value={job.templateName ?? "Not applicable"}
                          />
                          <Row
                            label="Provider Message ID"
                            value={job.providerMessageId ?? "Pending"}
                          />
                          <Row
                            label="Failure"
                            value={
                              job.failureMessage ??
                              job.failureCode ??
                              "No failure recorded"
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
