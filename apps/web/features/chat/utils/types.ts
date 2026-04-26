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
  attachments?: Attachment[];
};

export type ConversationStatus = "online" | "offline";

export type Conversation = {
  id: string;
  name: string;
  title: string;
  status: ConversationStatus;
  unread: number;
  initials: string;
  messages: Message[];
  quickReplies: string[];
  autoReplies: string[];
  searchText: string;
};

export type ConversationNote = {
  id: string;
  authorDisplayName: string;
  body: string;
  createdAt: number;
};

export type QueueJob = {
  id: string;
  status: string;
  attemptCount: number;
  nextAttemptAt: number | null;
  failureCode?: string | null;
  failureMessage?: string | null;
  providerMessageId?: string | null;
  payloadType: string;
  templateName?: string | null;
  createdAt: number;
};

export type ConversationNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  recommendation?: string | null;
  status: string;
  createdAt: number;
};

export type TemplateSuggestion = {
  id: string;
  language: string;
  title: string;
  body: string;
};

export type TeamMember = {
  userId: string;
  displayName: string;
  role: string;
};

export type WabaLifecycle = {
  approvalStatus: string;
  otpStatus: string;
  profileSyncStatus: string;
  connectionStatus: string;
  webhookStatus: string;
  phoneNumberId: string | null;
  businessAccountId: string | null;
};

export type ConversationDetails = Conversation & {
  rawStatus: "open" | "closed";
  channelLabel: string;
  waId: string | null;
  assignedUserId: string | null;
  assignedUserName: string | null;
  optOut: boolean;
  botPaused: boolean;
  handoffRequested: boolean;
  botReplyState: string;
  botReplyError?: string | null;
  serviceWindowOpen: boolean;
  serviceWindowExpiringSoon: boolean;
  serviceWindowExpiresAt: number | null;
  lastInboundAt: number | null;
  lastMessageAt: number | null;
  notes: ConversationNote[];
  queue: QueueJob[];
  notifications: ConversationNotification[];
};

export type ChatCopy = {
  loading: string;
  empty: string;
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
  sendPending: string;
  sendTemplate: string;
  manualReplyQueued: string;
  templateReplyQueued: string;
  freeformBlocked: string;
  templateFallback: string;
  templatePreview: string;
  optedOut: string;
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
