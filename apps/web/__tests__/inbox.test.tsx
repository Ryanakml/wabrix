import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InboxClient } from "../app/[locale]/dashboard/inbox/inbox-client";

const setConversationBotPause = vi.fn(async () => ({}));
const setConversationHandoff = vi.fn(async () => ({}));
const assignConversation = vi.fn(async () => ({}));
const setConversationStatus = vi.fn(async () => ({}));
const addConversationNote = vi.fn(async () => ({}));
const sendManualReply = vi.fn(async () => ({}));
const translateInboxMessages = vi.fn(async () => ({
  translations: [{ id: "message_1", translatedContent: "Translated hello" }],
}));

const apiMock = vi.hoisted(() => ({
  inbox: {
    getInboxWorkspace: "inbox.getInboxWorkspace",
    setConversationBotPause: "inbox.setConversationBotPause",
    setConversationHandoff: "inbox.setConversationHandoff",
    assignConversation: "inbox.assignConversation",
    setConversationStatus: "inbox.setConversationStatus",
    addConversationNote: "inbox.addConversationNote",
    sendManualReply: "inbox.sendManualReply",
  },
  ai: {
    translateInboxMessages: "ai.translateInboxMessages",
  },
}));

let workspaceState = {
  role: "org:member",
  canManageInbox: true,
  conversations: [
    {
      id: "conversation_1",
      status: "open",
      channel: "whatsapp",
      channelLabel: "WhatsApp",
      waId: "628111111111",
      profileName: "Ryan",
      assignedUserId: "user_1",
      assignedUserName: "Ops Ryan",
      botPaused: false,
      handoffRequested: false,
      botReplyState: "queued",
      botReplyError: null,
      serviceWindowExpiresAt: 1_710_000_000_000 + 60_000,
      serviceWindowExpiringSoon: true,
      lastInboundAt: 1_710_000_000_000,
      lastMessageAt: 1_710_000_000_000 + 5_000,
      lastMessagePreview: "Need help",
    },
    {
      id: "conversation_2",
      status: "open",
      channel: "whatsapp",
      channelLabel: "WhatsApp",
      waId: "628222222222",
      profileName: "Mira",
      assignedUserId: null,
      assignedUserName: null,
      botPaused: true,
      handoffRequested: true,
      botReplyState: "blocked",
      botReplyError: "handoff_requested",
      serviceWindowExpiresAt: 1_710_000_000_000 + 120_000,
      serviceWindowExpiringSoon: false,
      lastInboundAt: 1_710_000_000_000,
      lastMessageAt: 1_710_000_000_000 - 5_000,
      lastMessagePreview: "Please call me",
    },
  ],
  teamMembers: [
    { userId: "user_1", displayName: "Ops Ryan", role: "org:member" },
    { userId: "user_2", displayName: "Ops Mira", role: "org:admin" },
  ],
  wabaLifecycle: {
    connectionStatus: "configured",
    webhookStatus: "receiving",
    approvalStatus: "approved",
    otpStatus: "configured",
    profileSyncStatus: "synced",
    phoneNumberId: "123456",
    businessAccountId: "654321",
  },
  templateSuggestions: [
    {
      id: "reengagement_en",
      language: "en",
      title: "Re-engagement",
      body: "Reply here and our team will continue helping you.",
    },
  ],
  selectedConversation: {
    id: "conversation_1",
    status: "open",
    channel: "whatsapp",
    channelLabel: "WhatsApp",
    contactId: "contact_1",
    waId: "628111111111",
    profileName: "Ryan",
    assignedUserId: "user_1",
    assignedUserName: "Ops Ryan",
    botPaused: false,
    handoffRequested: false,
    botReplyState: "queued",
    botReplyError: null,
    serviceWindowExpiresAt: 1_710_000_000_000 + 60_000,
    serviceWindowExpiringSoon: true,
    serviceWindowOpen: true,
    lastInboundAt: 1_710_000_000_000,
    lastMessageAt: 1_710_000_000_000 + 5_000,
    lastMessagePreview: "Need help",
    messages: [
      {
        id: "message_1",
        role: "user",
        source: "whatsapp_inbound",
        content: "Halo",
        contentType: "text",
        deliveryState: "received",
        createdAt: 1_710_000_000_000,
      },
      {
        id: "message_2",
        role: "assistant",
        source: "bot_orchestrator",
        content: "Hello there",
        contentType: "text",
        deliveryState: "delivered",
        createdAt: 1_710_000_000_000 + 3_000,
      },
    ],
    notes: [
      {
        id: "note_1",
        authorDisplayName: "Ops Ryan",
        body: "Follow up after payment confirmation.",
        createdAt: 1_710_000_000_000 + 1_000,
      },
    ],
    queue: [
      {
        id: "queue_1",
        status: "sent",
        attemptCount: 1,
        nextAttemptAt: 1_710_000_000_000 + 10_000,
        failureCode: null,
        failureMessage: null,
        providerMessageId: "wamid.123",
        createdAt: 1_710_000_000_000 + 3_000,
      },
    ],
    notifications: [
      {
        id: "notification_1",
        type: "service_window_expiring",
        title: "Service window expiring",
        body: "Follow up soon.",
        recommendation: "Prepare a template fallback.",
        status: "open",
        createdAt: 1_710_000_000_000 + 2_000,
      },
    ],
  },
};

vi.mock("convex/react", () => ({
  useQuery: () => workspaceState,
  useMutation: (ref: string) => {
    switch (ref) {
      case apiMock.inbox.setConversationBotPause:
        return setConversationBotPause;
      case apiMock.inbox.setConversationHandoff:
        return setConversationHandoff;
      case apiMock.inbox.assignConversation:
        return assignConversation;
      case apiMock.inbox.setConversationStatus:
        return setConversationStatus;
      case apiMock.inbox.addConversationNote:
        return addConversationNote;
      case apiMock.inbox.sendManualReply:
        return sendManualReply;
      default:
        return vi.fn();
    }
  },
  useAction: () => translateInboxMessages,
}));

vi.mock("@wabrix/backend/convex/_generated/api", () => ({
  api: apiMock,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const copy = {
  loading: "Loading",
  empty: "Empty",
  conversationList: "Conversations",
  search: "Search",
  searchPlaceholder: "Search by contact",
  sortBy: "Sort by",
  sortRecent: "Most recent",
  sortOldest: "Oldest first",
  sortNeedsHuman: "Needs human",
  thread: "Thread",
  threadEmpty: "Select a conversation",
  notes: "Internal notes",
  notesEmpty: "No notes",
  addNote: "Add internal note",
  notePlaceholder: "Write note",
  saveNote: "Save note",
  noteSaved: "Internal note saved",
  serviceWindow: "Service window",
  serviceWindowClosed: "Closed",
  serviceWindowOpen: "Open",
  lastInbound: "Last inbound",
  lastMessage: "Last message",
  assignedTo: "Assigned to",
  unassigned: "Unassigned",
  assignPlaceholder: "Select agent",
  botReplyState: "Bot reply state",
  botReplyError: "Bot reply error",
  pauseBot: "Pause bot",
  resumeBot: "Resume bot",
  handoffOn: "Start handoff",
  handoffOff: "End handoff",
  closeConversation: "Close conversation",
  reopenConversation: "Reopen conversation",
  deliveryStatus: "Reply policy",
  composerLabel: "Manual reply",
  composerPlaceholder: "Write manual reply",
  sendReply: "Queue manual reply",
  sendPending: "Queueing",
  manualReplyQueued: "Manual reply queued",
  freeformBlocked: "Blocked",
  templateFallback: "Template fallback preview",
  templatePreview: "Selected template",
  translationToggle: "Translate thread",
  translationHide: "Show original",
  translating: "Translating",
  translationError: "Translation failed",
  queueOps: "Outbound queue",
  noQueue: "No queue",
  notifications: "Notifications",
  noNotifications: "No notifications",
  lifecycle: "WABA lifecycle",
  approvalStatus: "Approval",
  otpStatus: "OTP",
  profileSyncStatus: "Profile sync",
  connectionStatus: "Connection",
  webhookStatus: "Webhook",
  phoneNumberId: "Phone number ID",
  businessAccountId: "Business account ID",
  statusPending: "Pending",
  statusApproved: "Approved",
  statusConfigured: "Configured",
  statusMissing: "Missing",
  statusVerified: "Verified",
  statusReceiving: "Receiving",
  statusSynced: "Synced",
  openStatus: "Open",
  closedStatus: "Closed",
  stateIdle: "Idle",
  statePending: "Pending",
  stateGenerating: "Generating",
  stateQueued: "Queued",
  stateBlocked: "Blocked",
  stateFailed: "Failed",
  expiringSoon: "Service window is close to expiry.",
};

describe("Phase 10 inbox workspace", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    setConversationBotPause.mockClear();
    setConversationHandoff.mockClear();
    assignConversation.mockClear();
    setConversationStatus.mockClear();
    addConversationNote.mockClear();
    sendManualReply.mockClear();
    translateInboxMessages.mockClear();
    workspaceState = {
      ...workspaceState,
      selectedConversation: {
        ...workspaceState.selectedConversation,
        serviceWindowOpen: true,
      },
    };
  });

  it("renders the conversation table, thread, lifecycle state, and notification panels", () => {
    render(<InboxClient translationLanguage="en" copy={copy} />);

    expect(screen.getByTestId("conversation-row-conversation_1")).toBeDefined();
    expect(screen.getByText("Thread")).toBeDefined();
    expect(screen.getByText("WABA lifecycle")).toBeDefined();
    expect(screen.getAllByText("Service window is close to expiry.").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("Approved")).toBeDefined();
    expect(screen.getByText("Receiving")).toBeDefined();
    expect(screen.getByText("Synced")).toBeDefined();
  });

  it("filters the conversation list by search query", async () => {
    render(<InboxClient translationLanguage="en" copy={copy} />);

    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "Mira" },
    });

    await waitFor(() => {
      expect(screen.queryByTestId("conversation-row-conversation_1")).toBeNull();
      expect(screen.getByTestId("conversation-row-conversation_2")).toBeDefined();
    });
  });

  it("calls the pause mutation from the operator controls", async () => {
    render(<InboxClient translationLanguage="en" copy={copy} />);

    fireEvent.click(screen.getByText("Pause bot"));

    await waitFor(() => {
      expect(setConversationBotPause).toHaveBeenCalledWith({
        conversationId: "conversation_1",
        botPaused: true,
      });
    });
  });

  it("queues a manual reply through the mutation layer", async () => {
    render(<InboxClient translationLanguage="en" copy={copy} />);

    fireEvent.change(screen.getByLabelText("Manual reply"), {
      target: { value: "Human reply from inbox" },
    });
    fireEvent.click(screen.getByText("Queue manual reply"));

    await waitFor(() => {
      expect(sendManualReply).toHaveBeenCalledWith({
        conversationId: "conversation_1",
        body: "Human reply from inbox",
      });
    });
  });

  it("renders translated content without mutating the stored original message", async () => {
    render(<InboxClient translationLanguage="en" copy={copy} />);

    fireEvent.click(screen.getByText("Translate thread"));

    await waitFor(() => {
      expect(translateInboxMessages).toHaveBeenCalled();
      expect(screen.getByText("Translated hello")).toBeDefined();
      expect(screen.getByText("original: Halo")).toBeDefined();
    });
  });

  it("disables the freeform composer when the service window is closed", () => {
    workspaceState = {
      ...workspaceState,
      selectedConversation: {
        ...workspaceState.selectedConversation,
        serviceWindowOpen: false,
        serviceWindowExpiresAt: 1_710_000_000_000 - 1_000,
      },
    };

    render(<InboxClient translationLanguage="en" copy={copy} />);

    expect((screen.getByLabelText("Manual reply") as HTMLTextAreaElement).disabled).toBe(
      true,
    );
    expect(screen.getByText("Template fallback preview")).toBeDefined();
  });
});
