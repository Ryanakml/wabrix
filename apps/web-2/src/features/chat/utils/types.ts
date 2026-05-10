export type Attachment = {
  id: string;
  name: string;
  size: number;
  type: string;
};

export type Message = {
  id: string;
  sender: "user" | "contact";
  author: string;
  text: string;
  timestamp: string;
  contentType?:
    | "text"
    | "audio"
    | "image"
    | "document"
    | "template"
    | "unsupported";
  audioUrl?: string | null;
  imageUrl?: string | null;
  audioMimeType?: string | null;
  mediaFileName?: string | null;
  attachments?: Attachment[];
};

export type ConversationStatus = "online" | "offline";

export type Conversation = {
  id: string;
  name: string;
  title: string;
  status: ConversationStatus;
  serviceWindowOpen: boolean;
  handoffRequested: boolean;
  botPaused: boolean;
  botReplyState: string;
  botReplyError: string | null;
  unread: number;
  initials: string;
  messages: Message[];
  quickReplies: string[];
  canReply: boolean;
  focusedMessageId?: string | null;
  lastMessagePreview?: string | null;
  lastMessageTimestamp?: string | null;
};

export type ConversationMetadata = {
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
  serviceWindowExpiresAt: string | null;
  serviceWindowExpiringSoon: boolean;
  serviceWindowOpen: boolean;
  lastInboundAt: string;
  lastMessageAt: string;
  replyPolicy: "freeform" | "template_only";
  notes: Array<{
    id: string;
    authorDisplayName: string;
    body: string;
    createdAt: string;
  }>;
  queue: Array<{
    id: string;
    status: string;
    attemptCount: number;
    nextAttemptAt: string;
    failureCode: string | null;
    failureMessage: string | null;
    providerMessageId: string | null;
    payloadType: string;
    templateName: string | null;
    createdAt: string;
  }>;
};

export type ConversationDetails = {
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
  selectedConversation: ConversationMetadata | null;
};
