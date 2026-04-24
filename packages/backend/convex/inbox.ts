import { v } from "convex/values";
import type { Id } from "./_generated/dataModel.js";
import { mutation, query, type MutationCtx } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import {
  buildOutboundQueueIdempotencyKey,
  isServiceWindowOpen,
} from "./orchestrator.js";
import { assertUsageAllowed } from "./billing.js";
import { assertHasRole, requireOrgContext } from "./rbac.js";

const OUTBOUND_QUEUE_MAX_ATTEMPTS = 5;

type SchedulerLike = Pick<MutationCtx, "scheduler">["scheduler"];
type InboxMutationCtx = Pick<MutationCtx, "db"> & {
  runMutation?: MutationCtx["runMutation"];
  scheduler?: SchedulerLike;
};

function formatUserDisplayName(user: {
  firstName?: string;
  lastName?: string;
  email?: string;
}) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || user.email || "Team member";
}

function buildConversationTemplateSuggestions() {
  return [];
}

function extractTemplatePreview(
  components: unknown[],
  fallbackName: string,
) {
  const bodyComponent = components.find((component) => {
    if (!component || typeof component !== "object") {
      return false;
    }

    return (component as { type?: string }).type === "BODY";
  }) as { text?: string } | undefined;

  return bodyComponent?.text?.trim() || fallbackName;
}

function deriveWabaLifecycleState(
  integration:
    | {
        connectionStatus: "not_connected" | "configured" | "disabled";
        webhookStatus?: "pending" | "verified" | "receiving";
        approvalStatus?: "pending" | "approved" | "rejected" | "action_required";
        phoneVerificationStatus?: "missing" | "pending" | "verified" | "failed";
        businessProfileStatus?: "pending" | "synced" | "failed";
      }
    | null
    | undefined,
) {
  if (!integration) {
    return {
      approvalStatus: "pending",
      otpStatus: "missing",
      profileSyncStatus: "pending",
    } as const;
  }

  return {
    approvalStatus: integration.approvalStatus ?? "pending",
    otpStatus: integration.phoneVerificationStatus ?? "missing",
    profileSyncStatus: integration.businessProfileStatus ?? "pending",
  } as const;
}

function deriveConversationBotState({
  botPaused,
  handoffRequested,
}: {
  botPaused: boolean;
  handoffRequested: boolean;
}) {
  if (handoffRequested) {
    return {
      botReplyState: "blocked" as const,
      botReplyError: "handoff_requested",
    };
  }

  if (botPaused) {
    return {
      botReplyState: "blocked" as const,
      botReplyError: "bot_paused",
    };
  }

  return {
    botReplyState: "idle" as const,
    botReplyError: undefined,
  };
}

async function getConversationForOrg(
  ctx: Pick<MutationCtx, "db">,
  {
    organizationId,
    conversationId,
  }: {
    organizationId: Id<"organizations">;
    conversationId: Id<"conversations">;
  },
) {
  const conversation = await ctx.db.get(conversationId);

  if (!conversation || conversation.organizationId !== organizationId) {
    throw new Error("Conversation not found for the active organization.");
  }

  return conversation;
}

export async function queueManualReply(
  ctx: InboxMutationCtx,
  {
    conversationId,
    organizationId,
    authorDisplayName,
    body,
    now = Date.now(),
  }: {
    conversationId: Id<"conversations">;
    organizationId: Id<"organizations">;
    authorDisplayName: string;
    body: string;
    now?: number;
  },
) {
  const conversation = await getConversationForOrg(ctx, {
    organizationId,
    conversationId,
  });

  if (conversation.status !== "open") {
    throw new Error("Reopen the conversation before sending a manual reply.");
  }

  if (!isServiceWindowOpen(conversation.serviceWindowExpiresAt, now)) {
    throw new Error(
      "WhatsApp freeform replies are blocked after the 24-hour service window closes.",
    );
  }

  if (!conversation.contactId) {
    throw new Error("Conversation is missing a WhatsApp contact.");
  }

  const contact = await ctx.db.get(conversation.contactId);

  if (!contact) {
    throw new Error("Conversation contact could not be loaded.");
  }

  await assertUsageAllowed(ctx, {
    organizationId,
    kind: "outbound_messages",
    now,
  });

  const manualMessageId = await ctx.db.insert("messages", {
    organizationId,
    conversationId,
    role: "agent",
    source: "inbox_manual_reply",
    content: body,
    contentType: "text",
    deliveryState: "queued",
    createdAt: now,
    updatedAt: now,
  });

  const whatsappMessageId = await ctx.db.insert("whatsappMessages", {
    organizationId,
    integrationId: contact.integrationId,
    conversationId,
    contactId: contact._id,
    transcriptMessageId: manualMessageId,
    providerMessageId: `queued:${manualMessageId}`,
    waId: contact.waId,
    direction: "outbound",
    messageType: "text",
    transportStatus: "queued",
    rawSummary: body,
    createdAt: now,
    updatedAt: now,
  });

  await ctx.db.patch(manualMessageId, {
    transportMessageId: whatsappMessageId,
    updatedAt: now,
  });

  const idempotencyKey = buildOutboundQueueIdempotencyKey(manualMessageId);
  const existingQueueJob =
    (await ctx.db
      .query("outboundQueue")
      .withIndex("by_message_id", (q) => q.eq("messageId", manualMessageId))
      .first()) ??
    (await ctx.db
      .query("outboundQueue")
      .withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", idempotencyKey))
      .first());

  const outboundQueueId =
    existingQueueJob?._id ??
    (await ctx.db.insert("outboundQueue", {
      organizationId,
      integrationId: contact.integrationId,
      conversationId,
      contactId: contact._id,
      channel: "whatsapp",
      messageId: manualMessageId,
      whatsappMessageId,
      idempotencyKey,
      payloadType: "text",
      templateId: undefined,
      templateName: undefined,
      templateLanguageCode: undefined,
      templateComponents: undefined,
      requiresOpenServiceWindow: true,
      status: "queued",
      attemptCount: 0,
      maxAttempts: OUTBOUND_QUEUE_MAX_ATTEMPTS,
      nextAttemptAt: now,
      claimToken: undefined,
      lastAttemptAt: undefined,
      createdAt: now,
      updatedAt: now,
    }));

  await ctx.db.patch(conversationId, {
    lastMessageAt: now,
    lastMessagePreview: body,
    updatedAt: now,
  });

  await ctx.db.insert("auditLogs", {
    orgId: organizationId,
    action: "manual_reply_queued",
    details: {
      conversationId,
      manualMessageId,
      whatsappMessageId,
      outboundQueueId,
      authorDisplayName,
    },
    createdAt: now,
  });

  if (ctx.runMutation) {
    await ctx.runMutation(internal.billing.incrementUsageCountersMutation, {
      organizationId,
      outboundMessageCount: 1,
    });
  }

  if (ctx.scheduler) {
    await ctx.scheduler.runAfter(0, internal.outboundAction.processOutboundQueueJob, {
      queueJobId: outboundQueueId,
    });
  }

  return {
    manualMessageId,
    whatsappMessageId,
    outboundQueueId,
  };
}

export async function queueTemplateReply(
  ctx: InboxMutationCtx,
  {
    conversationId,
    organizationId,
    authorDisplayName,
    templateId,
    now = Date.now(),
  }: {
    conversationId: Id<"conversations">;
    organizationId: Id<"organizations">;
    authorDisplayName: string;
    templateId: Id<"whatsappTemplates">;
    now?: number;
  },
) {
  const conversation = await getConversationForOrg(ctx, {
    organizationId,
    conversationId,
  });

  if (conversation.status !== "open") {
    throw new Error("Reopen the conversation before sending a template reply.");
  }

  if (!conversation.contactId) {
    throw new Error("Conversation is missing a WhatsApp contact.");
  }

  const contact = await ctx.db.get(conversation.contactId);
  const template = await ctx.db.get(templateId);

  if (!contact) {
    throw new Error("Conversation contact could not be loaded.");
  }

  if (!template || template.organizationId !== organizationId) {
    throw new Error("Template not found for the active organization.");
  }

  if (!template.languageCode.trim()) {
    throw new Error("Approved template languageCode is required.");
  }

  if (template.status !== "approved") {
    throw new Error("Only approved WhatsApp templates can be sent.");
  }

  await assertUsageAllowed(ctx, {
    organizationId,
    kind: "outbound_messages",
    now,
  });

  const preview = extractTemplatePreview(template.components, template.name);
  const templateMessageId = await ctx.db.insert("messages", {
    organizationId,
    conversationId,
    role: "agent",
    source: "inbox_template_reply",
    content: preview,
    contentType: "template",
    templateId,
    deliveryState: "queued",
    createdAt: now,
    updatedAt: now,
  });

  const whatsappMessageId = await ctx.db.insert("whatsappMessages", {
    organizationId,
    integrationId: contact.integrationId,
    conversationId,
    contactId: contact._id,
    transcriptMessageId: templateMessageId,
    providerMessageId: `queued:${templateMessageId}`,
    waId: contact.waId,
    direction: "outbound",
    messageType: "template",
    templateId,
    templateName: template.name,
    templateLanguageCode: template.languageCode,
    transportStatus: "queued",
    rawSummary: preview,
    createdAt: now,
    updatedAt: now,
  });

  await ctx.db.patch(templateMessageId, {
    transportMessageId: whatsappMessageId,
    updatedAt: now,
  });

  const idempotencyKey = buildOutboundQueueIdempotencyKey(templateMessageId);
  const outboundQueueId = await ctx.db.insert("outboundQueue", {
    organizationId,
    integrationId: contact.integrationId,
    conversationId,
    contactId: contact._id,
    channel: "whatsapp",
    messageId: templateMessageId,
    whatsappMessageId,
    idempotencyKey,
    payloadType: "template",
    templateId,
    templateName: template.name,
    templateLanguageCode: template.languageCode,
    templateComponents: template.components,
    requiresOpenServiceWindow: false,
    status: "queued",
    attemptCount: 0,
    maxAttempts: OUTBOUND_QUEUE_MAX_ATTEMPTS,
    nextAttemptAt: now,
    claimToken: undefined,
    lastAttemptAt: undefined,
    createdAt: now,
    updatedAt: now,
  });

  await ctx.db.patch(conversationId, {
    lastMessageAt: now,
    lastMessagePreview: preview,
    updatedAt: now,
  });

  await ctx.db.insert("auditLogs", {
    orgId: organizationId,
    action: "template_reply_queued",
    details: {
      conversationId,
      templateId,
      templateMessageId,
      whatsappMessageId,
      outboundQueueId,
      authorDisplayName,
    },
    createdAt: now,
  });

  if (ctx.runMutation) {
    await ctx.runMutation(internal.billing.incrementUsageCountersMutation, {
      organizationId,
      outboundMessageCount: 1,
      outboundTemplateMessageCount: 1,
    });
  }

  if (ctx.scheduler) {
    await ctx.scheduler.runAfter(0, internal.outboundAction.processOutboundQueueJob, {
      queueJobId: outboundQueueId,
    });
  }

  return {
    templateMessageId,
    whatsappMessageId,
    outboundQueueId,
  };
}

export const getInboxWorkspace = query({
  args: {
    selectedConversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    const access = await requireOrgContext(ctx);
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_org_last_message_at", (q) =>
        q.eq("organizationId", access.organizationId),
      )
      .order("desc")
      .take(50);

    const selectedConversation =
      (args.selectedConversationId
        ? conversations.find(
            (conversation) => conversation._id === args.selectedConversationId,
          ) ?? null
        : null) ?? conversations[0] ?? null;

    const conversationSummaries = await Promise.all(
      conversations.map(async (conversation) => {
        const contact = conversation.contactId
          ? await ctx.db.get(conversation.contactId)
          : null;

        return {
          id: conversation._id,
          status: conversation.status,
          channel: conversation.channel,
          channelLabel: "WhatsApp",
          waId: contact?.waId ?? null,
          profileName: contact?.profileName ?? null,
          assignedUserId: conversation.assignedUserId ?? null,
          assignedUserName: conversation.assignedUserName ?? null,
          botPaused: conversation.botPaused,
          handoffRequested: conversation.handoffRequested,
          botReplyState: conversation.botReplyState,
          botReplyError: conversation.botReplyError ?? null,
          serviceWindowExpiresAt: conversation.serviceWindowExpiresAt ?? null,
          serviceWindowExpiringSoon: conversation.serviceWindowExpiringSoon,
          lastInboundAt: conversation.lastInboundAt,
          lastMessageAt: conversation.lastMessageAt,
          lastMessagePreview: conversation.lastMessagePreview ?? null,
        };
      }),
    );

    const selectedContact =
      selectedConversation?.contactId != null
        ? await ctx.db.get(selectedConversation.contactId)
        : null;
    const selectedIntegration = selectedContact
      ? await ctx.db.get(selectedContact.integrationId)
      : null;
    const selectedTemplates = selectedIntegration
      ? await ctx.db
          .query("whatsappTemplates")
          .withIndex("by_integration", (q) =>
            q.eq("integrationId", selectedIntegration._id),
          )
          .collect()
      : [];

    const teamMemberships = await ctx.db
      .query("orgMembers")
      .withIndex("by_org", (q) => q.eq("orgId", access.organizationId))
      .collect();
    const teamMembers = await Promise.all(
      teamMemberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId);

        return {
          userId: membership.userId,
          role: membership.role,
          displayName: formatUserDisplayName({
            firstName: user?.firstName,
            lastName: user?.lastName,
            email: user?.email,
          }),
        };
      }),
    );

    const wabaLifecycle = {
      connectionStatus: selectedIntegration?.connectionStatus ?? "not_connected",
      webhookStatus: selectedIntegration?.webhookStatus ?? "pending",
      phoneNumberId: selectedIntegration?.phoneNumberId ?? null,
      businessAccountId: selectedIntegration?.businessAccountId ?? null,
      ...deriveWabaLifecycleState(selectedIntegration),
    };

    const selectedMessages = selectedConversation
      ? await ctx.db
          .query("messages")
          .withIndex("by_conversation_created_at", (q) =>
            q.eq("conversationId", selectedConversation._id),
          )
          .order("desc")
          .take(50)
      : [];
    const selectedNotes = selectedConversation
      ? await ctx.db
          .query("conversationNotes")
          .withIndex("by_conversation_created_at", (q) =>
            q.eq("conversationId", selectedConversation._id),
          )
          .order("desc")
          .take(20)
      : [];
    const selectedQueue = selectedConversation
      ? (await ctx.db
          .query("outboundQueue")
          .withIndex("by_org_created_at", (q) =>
            q.eq("organizationId", access.organizationId),
          )
          .order("desc")
          .take(20)
        ).filter((queueJob) => queueJob.conversationId === selectedConversation._id)
      : [];
    const selectedNotifications = selectedConversation
      ? await ctx.db
          .query("dashboardNotifications")
          .withIndex("by_conversation", (q) =>
            q.eq("conversationId", selectedConversation._id),
          )
          .order("desc")
          .take(10)
      : [];

    return {
      role: access.role,
      canManageInbox: access.role === "org:admin" || access.role === "org:member",
      conversations: conversationSummaries,
      teamMembers,
      wabaLifecycle,
      templateSuggestions:
        selectedTemplates
          .filter((template) => template.status === "approved")
          .sort((left, right) => right.updatedAt - left.updatedAt)
          .map((template) => ({
            id: template._id,
            language: template.languageCode,
            title: template.name,
            body: extractTemplatePreview(template.components, template.name),
          })) || buildConversationTemplateSuggestions(),
      selectedConversation: selectedConversation
        ? {
            id: selectedConversation._id,
            status: selectedConversation.status,
            channel: selectedConversation.channel,
            channelLabel: "WhatsApp",
            contactId: selectedConversation.contactId ?? null,
            waId: selectedContact?.waId ?? null,
            profileName: selectedContact?.profileName ?? null,
            optOut: selectedContact?.optOut ?? false,
            assignedUserId: selectedConversation.assignedUserId ?? null,
            assignedUserName: selectedConversation.assignedUserName ?? null,
            botPaused: selectedConversation.botPaused,
            handoffRequested: selectedConversation.handoffRequested,
            botReplyState: selectedConversation.botReplyState,
            botReplyError: selectedConversation.botReplyError ?? null,
            serviceWindowExpiresAt: selectedConversation.serviceWindowExpiresAt ?? null,
            serviceWindowExpiringSoon: selectedConversation.serviceWindowExpiringSoon,
            serviceWindowOpen: isServiceWindowOpen(
              selectedConversation.serviceWindowExpiresAt,
              Date.now(),
            ),
            lastInboundAt: selectedConversation.lastInboundAt,
            lastMessageAt: selectedConversation.lastMessageAt,
            lastMessagePreview: selectedConversation.lastMessagePreview ?? null,
            messages: selectedMessages.reverse().map((message) => ({
              id: message._id,
              role: message.role,
              source: message.source,
              content: message.content,
              contentType: message.contentType,
              deliveryState: message.deliveryState,
              createdAt: message.createdAt,
            })),
            notes: selectedNotes.reverse().map((note) => ({
              id: note._id,
              authorDisplayName: note.authorDisplayName,
              body: note.body,
              createdAt: note.createdAt,
            })),
            queue: selectedQueue.map((job) => ({
              id: job._id,
              status: job.status,
              attemptCount: job.attemptCount,
              nextAttemptAt: job.nextAttemptAt,
              failureCode: job.failureCode ?? null,
              failureMessage: job.failureMessage ?? null,
              providerMessageId: job.providerMessageId ?? null,
              payloadType: job.payloadType,
              templateName: job.templateName ?? null,
              createdAt: job.createdAt,
            })),
            notifications: selectedNotifications.map((notification) => ({
              id: notification._id,
              type: notification.type,
              title: notification.title,
              body: notification.body,
              recommendation: notification.recommendation ?? null,
              status: notification.status,
              createdAt: notification.createdAt,
            })),
          }
        : null,
    };
  },
});

export const setConversationBotPause = mutation({
  args: {
    conversationId: v.id("conversations"),
    botPaused: v.boolean(),
  },
  handler: async (ctx, args) => {
    const access = await assertHasRole(ctx, "org:member");
    const conversation = await getConversationForOrg(ctx, {
      organizationId: access.organizationId,
      conversationId: args.conversationId,
    });
    const now = Date.now();
    const botState = deriveConversationBotState({
      botPaused: args.botPaused,
      handoffRequested: conversation.handoffRequested,
    });

    await ctx.db.patch(conversation._id, {
      botPaused: args.botPaused,
      botReplyState: botState.botReplyState,
      botReplyError: botState.botReplyError,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      orgId: access.organizationId,
      userId: access.userId,
      clerkUserId: access.clerkUserId,
      action: "conversation_bot_pause_updated",
      details: {
        conversationId: conversation._id,
        botPaused: args.botPaused,
      },
      createdAt: now,
    });

    return { conversationId: conversation._id, botPaused: args.botPaused };
  },
});

export const setConversationHandoff = mutation({
  args: {
    conversationId: v.id("conversations"),
    handoffRequested: v.boolean(),
  },
  handler: async (ctx, args) => {
    const access = await assertHasRole(ctx, "org:member");
    const conversation = await getConversationForOrg(ctx, {
      organizationId: access.organizationId,
      conversationId: args.conversationId,
    });
    const now = Date.now();
    const botState = deriveConversationBotState({
      botPaused: conversation.botPaused,
      handoffRequested: args.handoffRequested,
    });

    await ctx.db.patch(conversation._id, {
      handoffRequested: args.handoffRequested,
      botReplyState: botState.botReplyState,
      botReplyError: botState.botReplyError,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      orgId: access.organizationId,
      userId: access.userId,
      clerkUserId: access.clerkUserId,
      action: "conversation_handoff_updated",
      details: {
        conversationId: conversation._id,
        handoffRequested: args.handoffRequested,
      },
      createdAt: now,
    });

    return { conversationId: conversation._id, handoffRequested: args.handoffRequested };
  },
});

export const assignConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    assignedUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const access = await assertHasRole(ctx, "org:member");
    const conversation = await getConversationForOrg(ctx, {
      organizationId: access.organizationId,
      conversationId: args.conversationId,
    });
    const now = Date.now();

    if (!args.assignedUserId) {
      await ctx.db.patch(conversation._id, {
        assignedUserId: undefined,
        assignedClerkUserId: undefined,
        assignedUserName: undefined,
        updatedAt: now,
      });

      await ctx.db.insert("auditLogs", {
        orgId: access.organizationId,
        userId: access.userId,
        clerkUserId: access.clerkUserId,
        action: "conversation_assignment_updated",
        details: {
          conversationId: conversation._id,
          assignedUserId: null,
          assignedUserName: null,
        },
        createdAt: now,
      });

      return { conversationId: conversation._id, assignedUserId: null };
    }

    const membership = await ctx.db
      .query("orgMembers")
      .withIndex("by_org", (q) => q.eq("orgId", access.organizationId))
      .collect()
      .then((memberships) =>
        memberships.find((member) => member.userId === args.assignedUserId) ?? null,
      );

    if (!membership) {
      throw new Error("Selected assignee does not belong to the active organization.");
    }

    const assignedUser = await ctx.db.get(args.assignedUserId);
    const assignedUserName = formatUserDisplayName({
      firstName: assignedUser?.firstName,
      lastName: assignedUser?.lastName,
      email: assignedUser?.email,
    });

    await ctx.db.patch(conversation._id, {
      assignedUserId: args.assignedUserId,
      assignedClerkUserId: membership.clerkUserId,
      assignedUserName,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      orgId: access.organizationId,
      userId: access.userId,
      clerkUserId: access.clerkUserId,
      action: "conversation_assignment_updated",
      details: {
        conversationId: conversation._id,
        assignedUserId: args.assignedUserId,
        assignedUserName,
      },
      createdAt: now,
    });

    return {
      conversationId: conversation._id,
      assignedUserId: args.assignedUserId,
      assignedUserName,
    };
  },
});

export const setConversationStatus = mutation({
  args: {
    conversationId: v.id("conversations"),
    status: v.union(v.literal("open"), v.literal("closed")),
  },
  handler: async (ctx, args) => {
    const access = await assertHasRole(ctx, "org:member");
    const conversation = await getConversationForOrg(ctx, {
      organizationId: access.organizationId,
      conversationId: args.conversationId,
    });
    const now = Date.now();

    await ctx.db.patch(conversation._id, {
      status: args.status,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      orgId: access.organizationId,
      userId: access.userId,
      clerkUserId: access.clerkUserId,
      action: "conversation_status_updated",
      details: {
        conversationId: conversation._id,
        status: args.status,
      },
      createdAt: now,
    });

    return { conversationId: conversation._id, status: args.status };
  },
});

export const addConversationNote = mutation({
  args: {
    conversationId: v.id("conversations"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const access = await assertHasRole(ctx, "org:member");
    const conversation = await getConversationForOrg(ctx, {
      organizationId: access.organizationId,
      conversationId: args.conversationId,
    });
    const noteBody = args.body.trim();

    if (!noteBody) {
      throw new Error("Internal note body is required.");
    }

    const user = await ctx.db.get(access.userId);
    const now = Date.now();
    const noteId = await ctx.db.insert("conversationNotes", {
      organizationId: access.organizationId,
      conversationId: conversation._id,
      authorUserId: access.userId,
      authorClerkUserId: access.clerkUserId,
      authorDisplayName: formatUserDisplayName({
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.email,
      }),
      body: noteBody,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      orgId: access.organizationId,
      userId: access.userId,
      clerkUserId: access.clerkUserId,
      action: "conversation_note_added",
      details: {
        conversationId: conversation._id,
        noteId,
      },
      createdAt: now,
    });

    return { noteId, conversationId: conversation._id };
  },
});

export const sendManualReply = mutation({
  args: {
    conversationId: v.id("conversations"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const access = await assertHasRole(ctx, "org:member");
    const messageBody = args.body.trim();

    if (!messageBody) {
      throw new Error("Manual reply body is required.");
    }

    const user = await ctx.db.get(access.userId);
    const queued = await queueManualReply(ctx, {
      conversationId: args.conversationId,
      organizationId: access.organizationId,
      authorDisplayName: formatUserDisplayName({
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.email,
      }),
      body: messageBody,
    });

    return queued;
  },
});

export const sendTemplateReply = mutation({
  args: {
    conversationId: v.id("conversations"),
    templateId: v.id("whatsappTemplates"),
  },
  handler: async (ctx, args) => {
    const access = await assertHasRole(ctx, "org:member");
    const user = await ctx.db.get(access.userId);

    return queueTemplateReply(ctx, {
      conversationId: args.conversationId,
      organizationId: access.organizationId,
      authorDisplayName: formatUserDisplayName({
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.email,
      }),
      templateId: args.templateId,
    });
  },
});
