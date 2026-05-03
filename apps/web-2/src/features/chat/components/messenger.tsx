"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@wabrix/backend/convex/_generated/api";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { Attachment } from "../utils/types";
import {
  mapConversationDetails,
  mapConversationSummary,
  mapSelectedConversation,
} from "../utils/mappers";
import { ConversationList } from "./conversation-list";
import { ConversationSelect } from "./conversation-select";
import { ChatArea } from "./chat-area";
import { ConversationDetailsDrawer } from "./conversation-details-drawer";
import { MessengerSkeleton } from "./messenger-skeleton";

export function Messenger() {
  const searchParams = useSearchParams();
  const conversationIdFromQuery =
    searchParams.get("conversationId") ?? undefined;
  const focusMessageIdFromQuery =
    searchParams.get("focusMessageId") ?? undefined;
  const highlightedConversationId =
    searchParams.get("highlightConversationId") ?? undefined;
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | undefined
  >(undefined);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isUpdatingConversation, setIsUpdatingConversation] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  const workspaceData = useQuery(api.inbox.getInboxChatWorkspace, {
    selectedConversationId: selectedConversationId as never,
    focusMessageId: focusMessageIdFromQuery as never,
  });
  const [cachedWorkspace, setCachedWorkspace] = useState(workspaceData);

  useEffect(() => {
    if (workspaceData !== undefined) {
      setCachedWorkspace(workspaceData);
    }
  }, [workspaceData]);

  const workspace = workspaceData ?? cachedWorkspace;

  const drawerStateData = useQuery(
    api.inbox.getInboxConversationDrawerState,
    isDetailsOpen && selectedConversationId
      ? { selectedConversationId: selectedConversationId as never }
      : "skip",
  );
  const [cachedDrawerState, setCachedDrawerState] = useState(drawerStateData);

  useEffect(() => {
    if (drawerStateData !== undefined) {
      setCachedDrawerState(drawerStateData);
    }
  }, [drawerStateData]);

  const drawerState = drawerStateData ?? cachedDrawerState;

  const sendManualReply = useMutation(api.inbox.sendManualReply);
  const setConversationBotPause = useMutation(
    api.inbox.setConversationBotPause,
  );
  const setConversationHandoff = useMutation(api.inbox.setConversationHandoff);
  const assignConversation = useMutation(api.inbox.assignConversation);
  const setConversationStatus = useMutation(api.inbox.setConversationStatus);
  const addConversationNote = useMutation(api.inbox.addConversationNote);

  useEffect(() => {
    if (!selectedConversationId && conversationIdFromQuery) {
      setSelectedConversationId(conversationIdFromQuery);
    }
  }, [conversationIdFromQuery, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId && workspace?.selectedConversation?.id) {
      setSelectedConversationId(String(workspace.selectedConversation.id));
    }
  }, [selectedConversationId, workspace?.selectedConversation?.id]);

  useEffect(() => {
    setAttachments([]);
    setDraft("");
    setNoteBody("");
  }, [selectedConversationId]);

  const conversations = useMemo(
    () =>
      (workspace?.conversations ?? []).map((conversation: unknown) =>
        mapConversationSummary(conversation as never),
      ),
    [workspace?.conversations],
  );

  const activeConversation = useMemo(
    () =>
      mapSelectedConversation(
        (workspace?.selectedConversation ?? null) as never,
      ),
    [workspace?.selectedConversation],
  );

  const rawConversationDetails = useMemo(
    () => mapConversationDetails(drawerState as never),
    [drawerState],
  );
  const activeConversationId = selectedConversationId ?? activeConversation?.id;
  const conversationDetails =
    rawConversationDetails?.selectedConversation?.id === activeConversationId
      ? rawConversationDetails
      : null;

  const handleAddAttachments = (_files: FileList) => {
    toast.info("Attachments are not supported for inbox replies yet.");
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((current) =>
      current.filter((attachment) => attachment.id !== id),
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeConversation || !draft.trim()) {
      return;
    }

    setIsSending(true);
    try {
      await sendManualReply({
        conversationId: activeConversation.id as never,
        body: draft.trim(),
      });
      setDraft("");
      setAttachments([]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send reply.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const runConversationMutation = async (operation: () => Promise<unknown>) => {
    setIsUpdatingConversation(true);
    try {
      await operation();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update conversation.",
      );
    } finally {
      setIsUpdatingConversation(false);
    }
  };

  const handleAssignmentChange = async (value: string) => {
    if (!selectedConversationId) {
      return;
    }

    await runConversationMutation(() =>
      assignConversation({
        conversationId: selectedConversationId as never,
        assignedUserId: value ? (value as never) : undefined,
      }),
    );
  };

  const handlePauseToggle = async () => {
    const selectedConversation = conversationDetails?.selectedConversation;

    if (!selectedConversation) {
      return;
    }

    await runConversationMutation(() =>
      setConversationBotPause({
        conversationId: selectedConversation.id as never,
        botPaused: !selectedConversation.botPaused,
      }),
    );
  };

  const handleHandoffToggle = async () => {
    const selectedConversation = conversationDetails?.selectedConversation;

    if (!selectedConversation) {
      return;
    }

    await runConversationMutation(() =>
      setConversationHandoff({
        conversationId: selectedConversation.id as never,
        handoffRequested: !selectedConversation.handoffRequested,
      }),
    );
  };

  const handleStatusToggle = async () => {
    const selectedConversation = conversationDetails?.selectedConversation;

    if (!selectedConversation) {
      return;
    }

    await runConversationMutation(() =>
      setConversationStatus({
        conversationId: selectedConversation.id as never,
        status: selectedConversation.status === "open" ? "closed" : "open",
      }),
    );
  };

  const handleSaveNote = async () => {
    if (!selectedConversationId || !noteBody.trim()) {
      return;
    }

    setIsSavingNote(true);
    try {
      await addConversationNote({
        conversationId: selectedConversationId as never,
        body: noteBody.trim(),
      });
      setNoteBody("");
      toast.success("Note saved.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save note.",
      );
    } finally {
      setIsSavingNote(false);
    }
  };

  if (workspace === undefined) {
    return <MessengerSkeleton />;
  }

  if (!activeConversation) {
    return (
      <div className="border-border/50 bg-background/70 flex h-[calc(100dvh-5.5rem)] w-full items-center justify-center rounded-2xl border p-6 text-sm backdrop-blur-xl lg:rounded-3xl">
        No conversations available.
      </div>
    );
  }

  return (
    <>
      <div className="border-border/50 bg-background/70 relative grid h-[calc(100dvh-5.5rem)] w-full grid-rows-[auto,1fr] gap-3 overflow-hidden rounded-2xl border p-3 backdrop-blur-xl sm:gap-4 sm:p-4 lg:[grid-template-columns:30%_1fr] lg:grid-rows-[1fr] lg:gap-4 lg:rounded-3xl lg:p-5">
        <ConversationSelect
          conversations={conversations}
          selectedId={selectedConversationId ?? activeConversation.id}
          onSelect={setSelectedConversationId}
        />
        <ConversationList
          conversations={conversations}
          selectedId={selectedConversationId ?? activeConversation.id}
          highlightedId={highlightedConversationId}
          onSelect={setSelectedConversationId}
        />
        <ChatArea
          conversation={activeConversation}
          draft={draft}
          onDraftChange={setDraft}
          onSubmit={handleSubmit}
          attachments={attachments}
          onAddAttachments={handleAddAttachments}
          onRemoveAttachment={handleRemoveAttachment}
          onOpenDetails={() => setIsDetailsOpen(true)}
          composerDisabled={!activeConversation.canReply}
          isSending={isSending}
        />
      </div>

      <ConversationDetailsDrawer
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        conversation={activeConversation}
        details={conversationDetails}
        isLoading={Boolean(
          isDetailsOpen &&
          (drawerState === undefined ||
            rawConversationDetails?.selectedConversation?.id !==
              activeConversationId),
        )}
        noteBody={noteBody}
        onNoteBodyChange={setNoteBody}
        onSaveNote={handleSaveNote}
        onAssignmentChange={handleAssignmentChange}
        onPauseToggle={handlePauseToggle}
        onHandoffToggle={handleHandoffToggle}
        onStatusToggle={handleStatusToggle}
        isSavingNote={isSavingNote}
        isUpdatingConversation={isUpdatingConversation}
      />
    </>
  );
}
