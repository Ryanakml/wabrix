"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@wabrix/backend/convex/_generated/api";
import { ChatArea } from "./chat-area";
import { ChatHeader } from "./chat-header";
import { ConversationDetailsDrawer } from "./conversation-details-drawer";
import { ConversationList } from "./conversation-list";
import { ConversationSelect } from "./conversation-select";
import type {
  Attachment,
  ChatCopy,
  Conversation,
  ConversationDetails,
  Message,
  TeamMember,
  TemplateSuggestion,
  WabaLifecycle,
} from "../utils/types";

interface MessengerProps {
  translationLanguage: "en" | "id";
  copy: ChatCopy;
}

const QUICK_REPLIES = ["Thanks for the update", "On it", "Can you share more detail?"];

function formatTime(value: number | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function getDisplayName(profileName: string | null, waId: string | null) {
  return profileName ?? waId ?? "Unknown";
}

function getInitials(profileName: string | null, waId: string | null) {
  const label = getDisplayName(profileName, waId);
  const parts = label.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "NA";
  }

  const first = parts[0] ?? "";
  const second = parts[1] ?? "";

  if (parts.length === 1) {
    return first.slice(0, 2).toUpperCase();
  }

  return `${first[0] ?? ""}${second[0] ?? ""}`.toUpperCase();
}

function getHumanRank(conversation: {
  handoffRequested: boolean;
  botPaused: boolean;
  serviceWindowExpiringSoon: boolean;
  botReplyState: string;
}) {
  return (
    Number(conversation.handoffRequested) * 4 +
    Number(conversation.botPaused) * 3 +
    Number(conversation.serviceWindowExpiringSoon) * 2 +
    Number(conversation.botReplyState === "failed")
  );
}

function getMessageAuthor(
  message: {
    role: string;
    source: string;
  },
  conversationName: string,
  assignedUserName: string | null,
) {
  if (message.role === "assistant") {
    return "Assistant";
  }

  if (message.role === "agent") {
    return assignedUserName ?? "Agent";
  }

  if (message.source === "inbox_manual_reply") {
    return assignedUserName ?? "Agent";
  }

  return conversationName;
}

export function Messenger({ translationLanguage, copy }: MessengerProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(undefined);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [noteBody, setNoteBody] = useState("");
  const [translationEnabled, setTranslationEnabled] = useState(false);
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const workspaceQuery = useQuery(api.inbox.getInboxWorkspace, {
    selectedConversationId: selectedConversationId as never,
  });

  const prevWorkspaceRef = useRef(workspaceQuery);
  useEffect(() => {
    if (workspaceQuery !== undefined) {
      prevWorkspaceRef.current = workspaceQuery;
    }
  }, [workspaceQuery]);

  const workspace = workspaceQuery ?? prevWorkspaceRef.current;

  const setConversationBotPause = useMutation(api.inbox.setConversationBotPause);
  const setConversationHandoff = useMutation(api.inbox.setConversationHandoff);
  const assignConversation = useMutation(api.inbox.assignConversation);
  const setConversationStatus = useMutation(api.inbox.setConversationStatus);
  const addConversationNote = useMutation(api.inbox.addConversationNote);
  const sendManualReply = useMutation(api.inbox.sendManualReply);
  const sendTemplateReply = useMutation(api.inbox.sendTemplateReply);
  const translateInboxMessages = useAction(api.ai.translateInboxMessages);

  const selectedConversation = workspace?.selectedConversation ?? null;

  useEffect(() => {
    if (!selectedConversationId && workspace?.selectedConversation?.id) {
      setSelectedConversationId(workspace.selectedConversation.id);
    }
  }, [selectedConversationId, workspace?.selectedConversation?.id]);

  useEffect(() => {
    setDraft("");
    setAttachments([]);
    setNoteBody("");
    setSelectedTemplateId(null);
    setTranslationEnabled(false);
    setTranslatedMessages({});
    setDetailsOpen(false);
  }, [selectedConversation?.id]);

  const conversations = useMemo<Conversation[]>(() => {
    if (!workspace) {
      return [];
    }

    return [...workspace.conversations]
      .sort((left, right) => {
        return (
          getHumanRank(right) - getHumanRank(left) ||
          right.lastMessageAt - left.lastMessageAt
        );
      })
      .map((conversation) => {
        const name = getDisplayName(conversation.profileName, conversation.waId);
        const previewText = conversation.lastMessagePreview ?? "No messages yet";

        return {
          id: conversation.id,
          name,
          title: conversation.channelLabel,
          status: conversation.status === "open" ? "online" : "offline",
          unread: 0,
          initials: getInitials(conversation.profileName, conversation.waId),
          messages: [
            {
              id: `${conversation.id}-preview`,
              sender: "contact",
              author: name,
              text: previewText,
              timestamp: formatTime(conversation.lastMessageAt),
            },
          ],
          quickReplies: QUICK_REPLIES,
          autoReplies: [],
          searchText: [
            conversation.profileName,
            conversation.waId,
            conversation.assignedUserName,
            conversation.lastMessagePreview,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase(),
        };
      });
  }, [workspace]);

  const activeConversation = useMemo<ConversationDetails | null>(() => {
    if (!selectedConversation) {
      return null;
    }

    const name = getDisplayName(selectedConversation.profileName, selectedConversation.waId);
    const messages: Message[] = selectedConversation.messages.map((message) => {
      const translatedText = translatedMessages[message.id];

      return {
        id: message.id,
        sender: message.role === "assistant" || message.role === "agent" ? "user" : "contact",
        author: getMessageAuthor(message, name, selectedConversation.assignedUserName),
        text: translationEnabled ? (translatedText ?? message.content ?? "") : (message.content ?? ""),
        timestamp: formatTime(message.createdAt),
      };
    });

    return {
      id: selectedConversation.id,
      name,
      title: selectedConversation.channelLabel,
      status: selectedConversation.status === "open" ? "online" : "offline",
      unread: 0,
      initials: getInitials(selectedConversation.profileName, selectedConversation.waId),
      messages,
      quickReplies: QUICK_REPLIES,
      autoReplies: [],
      searchText: [
        selectedConversation.profileName,
        selectedConversation.waId,
        selectedConversation.assignedUserName,
        selectedConversation.lastMessagePreview,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
      rawStatus: selectedConversation.status,
      channelLabel: selectedConversation.channelLabel,
      waId: selectedConversation.waId,
      assignedUserId: selectedConversation.assignedUserId,
      assignedUserName: selectedConversation.assignedUserName,
      optOut: selectedConversation.optOut,
      botPaused: selectedConversation.botPaused,
      handoffRequested: selectedConversation.handoffRequested,
      botReplyState: selectedConversation.botReplyState,
      botReplyError: selectedConversation.botReplyError,
      serviceWindowOpen: selectedConversation.serviceWindowOpen,
      serviceWindowExpiringSoon: selectedConversation.serviceWindowExpiringSoon,
      serviceWindowExpiresAt: selectedConversation.serviceWindowExpiresAt,
      lastInboundAt: selectedConversation.lastInboundAt,
      lastMessageAt: selectedConversation.lastMessageAt,
      notes: selectedConversation.notes,
      queue: selectedConversation.queue,
      notifications: selectedConversation.notifications,
    };
  }, [selectedConversation, translatedMessages, translationEnabled]);

  const selectedId = selectedConversationId ?? conversations[0]?.id ?? "";
  const templates = (workspace?.templateSuggestions ?? []) as TemplateSuggestion[];
  const teamMembers = (workspace?.teamMembers ?? []) as TeamMember[];
  const lifecycle = (workspace?.wabaLifecycle ?? null) as WabaLifecycle | null;

  const handleAddAttachments = useCallback((files: FileList) => {
    const nextAttachments: Attachment[] = Array.from(files).map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      size: file.size,
      type: file.type,
    }));

    setAttachments((current) => [...current, ...nextAttachments]);
  }, []);

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id));
  }, []);

  const handleTranslationToggle = useCallback(async () => {
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

        setTranslatedMessages(
          Object.fromEntries(
            result.translations.map((translation) => [
              translation.id,
              translation.translatedContent,
            ]),
          ),
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : copy.translationError);
        return;
      } finally {
        setIsTranslating(false);
      }
    }

    setTranslationEnabled(true);
  }, [
    copy.translationError,
    selectedConversation,
    translatedMessages,
    translationEnabled,
    translateInboxMessages,
    translationLanguage,
  ]);

  const handlePauseToggle = useCallback(async () => {
    if (!selectedConversation) {
      return;
    }

    await setConversationBotPause({
      conversationId: selectedConversation.id as never,
      botPaused: !selectedConversation.botPaused,
    });
  }, [selectedConversation, setConversationBotPause]);

  const handleHandoffToggle = useCallback(async () => {
    if (!selectedConversation) {
      return;
    }

    await setConversationHandoff({
      conversationId: selectedConversation.id as never,
      handoffRequested: !selectedConversation.handoffRequested,
    });
  }, [selectedConversation, setConversationHandoff]);

  const handleStatusToggle = useCallback(async () => {
    if (!selectedConversation) {
      return;
    }

    await setConversationStatus({
      conversationId: selectedConversation.id as never,
      status: selectedConversation.status === "open" ? "closed" : "open",
    });
  }, [selectedConversation, setConversationStatus]);

  const handleAssignmentChange = useCallback(
    async (value: string) => {
      if (!selectedConversation) {
        return;
      }

      await assignConversation({
        conversationId: selectedConversation.id as never,
        assignedUserId: value ? (value as never) : undefined,
      });
    },
    [assignConversation, selectedConversation],
  );

  const handleSaveNote = useCallback(async () => {
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
  }, [addConversationNote, copy.noteSaved, noteBody, selectedConversation]);

  const handleSendTemplate = useCallback(async () => {
    if (!selectedConversation || !selectedTemplateId) {
      return;
    }

    setIsSendingReply(true);

    try {
      await sendTemplateReply({
        conversationId: selectedConversation.id as never,
        templateId: selectedTemplateId as never,
      });
      toast.success(copy.templateReplyQueued);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.freeformBlocked);
    } finally {
      setIsSendingReply(false);
    }
  }, [
    copy.freeformBlocked,
    copy.templateReplyQueued,
    selectedConversation,
    selectedTemplateId,
    sendTemplateReply,
  ]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!selectedConversation) {
        return;
      }

      if (!draft.trim()) {
        if (attachments.length > 0) {
          toast.error("File attachments are not wired yet.");
        }
        return;
      }

      if (!selectedConversation.serviceWindowOpen) {
        if (selectedTemplateId) {
          await handleSendTemplate();
          return;
        }

        toast.error(copy.freeformBlocked);
        return;
      }

      setIsSendingReply(true);

      try {
        await sendManualReply({
          conversationId: selectedConversation.id as never,
          body: draft.trim(),
        });
        setDraft("");
        setAttachments([]);
        toast.success(copy.manualReplyQueued);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : copy.freeformBlocked);
      } finally {
        setIsSendingReply(false);
      }
    },
    [
      attachments.length,
      copy.freeformBlocked,
      copy.manualReplyQueued,
      draft,
      handleSendTemplate,
      selectedConversation,
      selectedTemplateId,
      sendManualReply,
    ],
  );

  if (workspace === undefined) {
    return (
      <div className="border-border/50 bg-background/70 relative grid h-[calc(100dvh-5.5rem)] w-full grid-rows-[auto,1fr] gap-3 overflow-hidden rounded-2xl border p-3 backdrop-blur-xl sm:gap-4 sm:p-4 lg:[grid-template-columns:30%_1fr] lg:grid-rows-[1fr] lg:gap-4 lg:rounded-3xl lg:p-5">
        <ConversationSelect conversations={[]} selectedId="" onSelect={() => undefined} />
        <ConversationList conversations={[]} selectedId="" onSelect={() => undefined} />
        <div className="border-border/40 bg-background/80 flex min-h-0 flex-col items-center justify-center rounded-2xl border p-6 text-sm text-muted-foreground backdrop-blur sm:rounded-3xl lg:col-start-2 lg:col-end-3">
          {copy.loading}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border-border/50 bg-background/70 relative grid h-[calc(100dvh-5.5rem)] w-full grid-rows-[auto,1fr] gap-3 overflow-hidden rounded-2xl border p-3 backdrop-blur-xl sm:gap-4 sm:p-4 lg:[grid-template-columns:30%_1fr] lg:grid-rows-[1fr] lg:gap-4 lg:rounded-3xl lg:p-5">
        <ConversationSelect
          conversations={conversations}
          selectedId={selectedId}
          onSelect={setSelectedConversationId}
        />
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={setSelectedConversationId}
        />
        {activeConversation ? (
          <ChatArea
            conversation={activeConversation}
            draft={draft}
            onDraftChange={setDraft}
            onSubmit={handleSubmit}
            attachments={attachments}
            onAddAttachments={handleAddAttachments}
            onRemoveAttachment={handleRemoveAttachment}
            onOpenDetails={() => setDetailsOpen(true)}
          />
        ) : (
          <div className="border-border/40 bg-background/80 flex min-h-0 flex-col items-center justify-center rounded-2xl border p-6 text-sm text-muted-foreground backdrop-blur sm:rounded-3xl lg:col-start-2 lg:col-end-3">
            <div className="w-full max-w-sm">
              <ChatHeader
                conversation={{
                  id: "empty",
                  name: "Messenger",
                  title: "No conversation selected",
                  status: "offline",
                  unread: 0,
                  initials: "ME",
                  messages: [],
                  quickReplies: [],
                  autoReplies: [],
                  searchText: "",
                }}
              />
              <p className="mt-8 text-center">{conversations.length === 0 ? copy.empty : copy.threadEmpty}</p>
            </div>
          </div>
        )}
      </div>

      <ConversationDetailsDrawer
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        conversation={activeConversation}
        teamMembers={teamMembers}
        templates={templates}
        lifecycle={lifecycle}
        noteBody={noteBody}
        onNoteBodyChange={setNoteBody}
        onSaveNote={handleSaveNote}
        onAssignmentChange={handleAssignmentChange}
        onPauseToggle={handlePauseToggle}
        onHandoffToggle={handleHandoffToggle}
        onStatusToggle={handleStatusToggle}
        onTranslationToggle={handleTranslationToggle}
        translationEnabled={translationEnabled}
        isTranslating={isTranslating}
        isSavingNote={isSavingNote}
        isSendingReply={isSendingReply}
        selectedTemplateId={selectedTemplateId}
        onTemplateSelect={setSelectedTemplateId}
        onSendTemplate={handleSendTemplate}
        copy={copy}
      />
    </>
  );
}
