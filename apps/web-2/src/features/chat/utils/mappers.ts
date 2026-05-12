import type {
  Conversation,
  ConversationDetails,
  ConversationMetadata,
  Message,
} from "./types";

function formatTimestamp(value: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);

  if (parts.length === 0) {
    return "NA";
  }

  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

type ChatWorkspaceSummaryRecord = {
  id: string;
  status: "open" | "closed";
  channelLabel: string;
  waId: string | null;
  profileName: string | null;
  assignedUserName: string | null;
  handoffRequested: boolean;
  botPaused: boolean;
  lastMessageAt: number;
  lastMessagePreview: string | null;
  serviceWindowOpen: boolean;
};

type ChatWorkspaceMessageRecord = {
  id: string;
  role: "user" | "assistant" | "agent" | "system";
  content: string;
  contentType: string;
  deliveryState: string;
  failureCode?: string | null;
  failureMessage?: string | null;
  createdAt: number;
  audioUrl?: string | null;
  imageUrl?: string | null;
  audioMimeType?: string | null;
  mediaFileName?: string | null;
};

type ChatWorkspaceSelectedConversationRecord = {
  id: string;
  status: "open" | "closed";
  channelLabel: string;
  waId: string | null;
  profileName: string | null;
  assignedUserName: string | null;
  handoffRequested: boolean;
  botPaused: boolean;
  botReplyState: string;
  botReplyError: string | null;
  serviceWindowOpen: boolean;
  focusedMessageId?: string | null;
  messages: ChatWorkspaceMessageRecord[];
};

type DrawerDetailsRecord = {
  teamMembers: Array<{
    userId: string;
    role: string;
    displayName: string;
  }>;
  wabaLifecycle: {
    connectionStatus: string;
    webhookStatus: string;
    phoneNumberId: string | null;
    businessAccountId: string | null;
    approvalStatus: string;
    otpStatus: string;
    profileSyncStatus: string;
  };
  selectedConversation: {
    id: string;
    status: "open" | "closed";
    profileName: string | null;
    waId: string | null;
    assignedUserId: string | null;
    assignedUserName: string | null;
    botPaused: boolean;
    handoffRequested: boolean;
    botReplyState: string;
    botReplyError: string | null;
    serviceWindowExpiresAt: number | null;
    serviceWindowExpiringSoon: boolean;
    serviceWindowOpen: boolean;
    lastInboundAt: number;
    lastMessageAt: number;
    replyPolicy: "freeform" | "template_only";
    notes: Array<{
      id: string;
      authorDisplayName: string;
      body: string;
      createdAt: number;
    }>;
    queue: Array<{
      id: string;
      status: string;
      attemptCount: number;
      nextAttemptAt: number;
      failureCode: string | null;
      failureMessage: string | null;
      providerMessageId: string | null;
      payloadType: string;
      templateName: string | null;
      createdAt: number;
    }>;
  } | null;
};

function mapMessageRecord(
  message: ChatWorkspaceMessageRecord,
  {
    contactName,
    assignedUserName,
  }: {
    contactName: string;
    assignedUserName: string | null;
  },
): Message {
  if (message.role === "user") {
    return {
      id: String(message.id),
      sender: "contact",
      author: contactName,
      text: message.content,
      timestamp: formatTimestamp(message.createdAt),
      deliveryState: message.deliveryState,
      failureCode: message.failureCode ?? null,
      failureMessage: message.failureMessage ?? null,
      contentType: message.contentType as Message["contentType"],
      audioUrl: message.audioUrl ?? null,
      imageUrl: message.imageUrl ?? null,
      audioMimeType: message.audioMimeType ?? null,
      mediaFileName: message.mediaFileName ?? null,
    };
  }

  return {
    id: String(message.id),
    sender: "user",
    author: message.role === "assistant" ? "Bot" : (assignedUserName ?? "You"),
    text: message.content,
    timestamp: formatTimestamp(message.createdAt),
    deliveryState: message.deliveryState,
    failureCode: message.failureCode ?? null,
    failureMessage: message.failureMessage ?? null,
    contentType: message.contentType as Message["contentType"],
    audioUrl: message.audioUrl ?? null,
    imageUrl: message.imageUrl ?? null,
    audioMimeType: message.audioMimeType ?? null,
    mediaFileName: message.mediaFileName ?? null,
  };
}

export function mapConversationSummary(
  summary: ChatWorkspaceSummaryRecord,
): Conversation {
  const name = summary.profileName ?? summary.waId ?? "Unknown";

  return {
    id: String(summary.id),
    name,
    title: summary.waId ?? summary.channelLabel,
    status:
      summary.status === "open" && summary.serviceWindowOpen
        ? "online"
        : "offline",
    serviceWindowOpen: summary.serviceWindowOpen,
    handoffRequested: summary.handoffRequested,
    botPaused: summary.botPaused,
    botReplyState: "unknown",
    botReplyError: null,
    unread: 0,
    initials: getInitials(name),
    messages: [],
    quickReplies: [],
    canReply: summary.status === "open",
    lastMessagePreview: summary.lastMessagePreview,
    lastMessageTimestamp: formatTimestamp(summary.lastMessageAt),
  };
}

export function mapSelectedConversation(
  selectedConversation: ChatWorkspaceSelectedConversationRecord | null,
): Conversation | null {
  if (!selectedConversation) {
    return null;
  }

  const name =
    selectedConversation.profileName ?? selectedConversation.waId ?? "Unknown";

  return {
    id: String(selectedConversation.id),
    name,
    title: selectedConversation.waId ?? selectedConversation.channelLabel,
    status:
      selectedConversation.status === "open" &&
      selectedConversation.serviceWindowOpen
        ? "online"
        : "offline",
    serviceWindowOpen: selectedConversation.serviceWindowOpen,
    handoffRequested: selectedConversation.handoffRequested,
    botPaused: selectedConversation.botPaused,
    botReplyState: selectedConversation.botReplyState,
    botReplyError: selectedConversation.botReplyError,
    unread: 0,
    initials: getInitials(name),
    focusedMessageId: selectedConversation.focusedMessageId ?? null,
    messages: selectedConversation.messages.map((message) =>
      mapMessageRecord(message, {
        contactName: name,
        assignedUserName: selectedConversation.assignedUserName,
      }),
    ),
    quickReplies: [],
    canReply: selectedConversation.status === "open",
  };
}

export function mapConversationDetails(
  details: DrawerDetailsRecord | undefined,
): ConversationDetails | null {
  if (!details) {
    return null;
  }

  const selectedConversation: ConversationMetadata | null =
    details.selectedConversation
      ? {
          id: String(details.selectedConversation.id),
          status: details.selectedConversation.status,
          profileName: details.selectedConversation.profileName,
          waId: details.selectedConversation.waId,
          assignedUserId: details.selectedConversation.assignedUserId
            ? String(details.selectedConversation.assignedUserId)
            : null,
          assignedUserName: details.selectedConversation.assignedUserName,
          botPaused: details.selectedConversation.botPaused,
          handoffRequested: details.selectedConversation.handoffRequested,
          botReplyState: details.selectedConversation.botReplyState,
          botReplyError: details.selectedConversation.botReplyError,
          serviceWindowExpiresAt: details.selectedConversation
            .serviceWindowExpiresAt
            ? formatTimestamp(
                details.selectedConversation.serviceWindowExpiresAt,
              )
            : null,
          serviceWindowExpiringSoon:
            details.selectedConversation.serviceWindowExpiringSoon,
          serviceWindowOpen: details.selectedConversation.serviceWindowOpen,
          lastInboundAt: formatTimestamp(
            details.selectedConversation.lastInboundAt,
          ),
          lastMessageAt: formatTimestamp(
            details.selectedConversation.lastMessageAt,
          ),
          replyPolicy: details.selectedConversation.replyPolicy,
          notes: details.selectedConversation.notes.map((note) => ({
            id: String(note.id),
            authorDisplayName: note.authorDisplayName,
            body: note.body,
            createdAt: formatTimestamp(note.createdAt),
          })),
          queue: details.selectedConversation.queue.map((job) => ({
            id: String(job.id),
            status: job.status,
            attemptCount: job.attemptCount,
            nextAttemptAt: formatTimestamp(job.nextAttemptAt),
            failureCode: job.failureCode,
            failureMessage: job.failureMessage,
            providerMessageId: job.providerMessageId,
            payloadType: job.payloadType,
            templateName: job.templateName,
            createdAt: formatTimestamp(job.createdAt),
          })),
        }
      : null;

  return {
    teamMembers: details.teamMembers.map((member) => ({
      userId: String(member.userId),
      role: member.role,
      displayName: member.displayName,
    })),
    wabaLifecycle: details.wabaLifecycle,
    selectedConversation,
  };
}
