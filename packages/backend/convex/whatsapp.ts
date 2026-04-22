import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "./_generated/server.js";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server.js";
import { encryptSecret, hashSecret } from "./lib/crypto.js";
import { assertHasRole, requireOrgContext } from "./rbac.js";

export function deriveWhatsAppConnectionStatus({
  enabled,
  phoneNumberId,
  businessAccountId,
  hasAccessToken,
  hasAppSecret,
  hasVerifyToken,
}: {
  enabled: boolean;
  phoneNumberId: string;
  businessAccountId: string;
  hasAccessToken: boolean;
  hasAppSecret: boolean;
  hasVerifyToken: boolean;
}) {
  if (!enabled) {
    return "disabled" as const;
  }

  if (
    phoneNumberId.trim().length > 0 &&
    businessAccountId.trim().length > 0 &&
    hasAccessToken &&
    hasAppSecret &&
    hasVerifyToken
  ) {
    return "configured" as const;
  }

  return "not_connected" as const;
}

export function sanitizeWhatsAppIntegrationForFrontend(
  integration?: Doc<"whatsappIntegrations"> | null,
) {
  return {
    integrationId: integration?._id ?? null,
    phoneNumberId: integration?.phoneNumberId ?? "",
    businessAccountId: integration?.businessAccountId ?? "",
    enabled: integration?.enabled ?? false,
    connectionStatus:
      integration?.connectionStatus ??
      deriveWhatsAppConnectionStatus({
        enabled: false,
        phoneNumberId: "",
        businessAccountId: "",
        hasAccessToken: false,
        hasAppSecret: false,
        hasVerifyToken: false,
      }),
    hasAccessToken: Boolean(integration?.accessTokenEncrypted),
    hasAppSecret: Boolean(integration?.appSecretEncrypted),
    hasVerifyToken: Boolean(integration?.verifyTokenHash),
    approvalStatus: integration?.approvalStatus ?? "pending",
    phoneVerificationStatus: integration?.phoneVerificationStatus ?? "missing",
    businessProfileStatus: integration?.businessProfileStatus ?? "pending",
    displayNameReviewStatus: integration?.displayNameReviewStatus ?? "pending",
    messagingLimitTier: integration?.messagingLimitTier ?? null,
    lastWebhookEventAt: integration?.lastWebhookEventAt ?? null,
    lastTemplateSyncAt: integration?.lastTemplateSyncAt ?? null,
    lastTemplateSyncError: integration?.lastTemplateSyncError ?? null,
    lastLifecycleRefreshAt: integration?.lastLifecycleRefreshAt ?? null,
    lastLifecycleError: integration?.lastLifecycleError ?? null,
    businessProfile: integration?.businessProfile ?? null,
  };
}

function deriveLifecycleBlockers(
  integration?: Doc<"whatsappIntegrations"> | null,
) {
  if (!integration) {
    return ["configure_integration"] as const;
  }

  const blockers: string[] = [];

  if (integration.connectionStatus !== "configured") {
    blockers.push("connection_incomplete");
  }

  if (integration.approvalStatus && integration.approvalStatus !== "approved") {
    blockers.push("meta_approval_pending");
  }

  if (
    integration.phoneVerificationStatus &&
    integration.phoneVerificationStatus !== "verified"
  ) {
    blockers.push("phone_verification_incomplete");
  }

  if (
    integration.businessProfileStatus &&
    integration.businessProfileStatus !== "synced"
  ) {
    blockers.push("business_profile_unsynced");
  }

  return blockers;
}

function normalizeTemplateStatus(rawStatus?: string) {
  switch ((rawStatus ?? "").toLowerCase()) {
    case "approved":
    case "active":
      return "approved" as const;
    case "pending":
    case "in_review":
      return "pending" as const;
    case "rejected":
      return "rejected" as const;
    case "paused":
      return "paused" as const;
    case "disabled":
      return "disabled" as const;
    case "archived":
      return "archived" as const;
    default:
      return "draft" as const;
  }
}

function normalizeLifecycleApprovalStatus(rawStatus?: string) {
  switch ((rawStatus ?? "").toLowerCase()) {
    case "approved":
    case "live":
    case "enabled":
      return "approved" as const;
    case "rejected":
    case "disabled":
      return "rejected" as const;
    case "action_required":
    case "restricted":
      return "action_required" as const;
    default:
      return "pending" as const;
  }
}

function maybeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter((item): item is string => typeof item === "string");
}

async function upsertDashboardNotification(
  ctx: Pick<MutationCtx, "db">,
  {
    organizationId,
    type,
    dedupeKey,
    severity,
    title,
    body,
    recommendation,
  }: {
    organizationId: Id<"organizations">;
    type: "template_rejected" | "waba_action_required";
    dedupeKey: string;
    severity: "warning" | "error";
    title: string;
    body: string;
    recommendation?: string;
  },
) {
  const existing = await ctx.db
    .query("dashboardNotifications")
    .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", dedupeKey))
    .first();
  const now = Date.now();

  if (existing) {
    await ctx.db.patch(existing._id, {
      type,
      severity,
      title,
      body,
      recommendation,
      status: "open",
      updatedAt: now,
    });

    return existing._id;
  }

  return ctx.db.insert("dashboardNotifications", {
    organizationId,
    type,
    severity,
    title,
    body,
    recommendation,
    dedupeKey,
    status: "open",
    createdAt: now,
    updatedAt: now,
  });
}

function parseRawWebhookPayload(rawPayload: string) {
  return JSON.parse(rawPayload) as {
    entry?: Array<{
      changes?: Array<{
        field?: string;
        value?: Record<string, unknown>;
      }>;
    }>;
  };
}

function extractTemplateWebhookUpdates(rawPayload: string) {
  const payload = parseRawWebhookPayload(rawPayload);
  const updates: Array<{
    metaTemplateId?: string;
    name?: string;
    languageCode?: string;
    category?: "marketing" | "utility" | "authentication";
    status: ReturnType<typeof normalizeTemplateStatus>;
    rejectionReason?: string;
    components: unknown[];
  }> = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "message_template_status_update") {
        continue;
      }

      const value = change.value ?? {};
      const rawCategory =
        typeof value.category === "string" ? value.category.toLowerCase() : "utility";

      updates.push({
        metaTemplateId:
          typeof value.message_template_id === "string"
            ? value.message_template_id
            : undefined,
        name: typeof value.message_template_name === "string" ? value.message_template_name : undefined,
        languageCode:
          typeof value.message_template_language === "string"
            ? value.message_template_language
            : typeof value.language === "string"
              ? value.language
              : undefined,
        category:
          rawCategory === "marketing" || rawCategory === "authentication"
            ? rawCategory
            : "utility",
        status: normalizeTemplateStatus(
          typeof value.event === "string"
            ? value.event
            : typeof value.status === "string"
              ? value.status
              : undefined,
        ),
        rejectionReason:
          typeof value.reason === "string"
            ? value.reason
            : typeof value.rejection_reason === "string"
              ? value.rejection_reason
              : undefined,
        components: Array.isArray(value.components) ? value.components : [],
      });
    }
  }

  return updates;
}

function extractLifecycleUpdate(rawPayload: string) {
  const payload = parseRawWebhookPayload(rawPayload);
  const lifecycle = {
    approvalStatus: undefined as
      | "pending"
      | "approved"
      | "rejected"
      | "action_required"
      | undefined,
    phoneVerificationStatus: undefined as
      | "missing"
      | "pending"
      | "verified"
      | "failed"
      | undefined,
    businessProfileStatus: undefined as "pending" | "synced" | "failed" | undefined,
    displayNameReviewStatus: undefined as
      | "pending"
      | "approved"
      | "rejected"
      | undefined,
    messagingLimitTier: undefined as string | undefined,
    businessProfile: undefined as
      | {
          about?: string;
          address?: string;
          description?: string;
          email?: string;
          vertical?: string;
          websites?: string[];
        }
      | undefined,
    rawField: undefined as string | undefined,
  };

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      lifecycle.rawField = change.field;
      const value = change.value ?? {};

      if (typeof value.account_review_status === "string") {
        lifecycle.approvalStatus = normalizeLifecycleApprovalStatus(
          value.account_review_status,
        );
      }

      if (typeof value.meta_app_status === "string") {
        lifecycle.approvalStatus = normalizeLifecycleApprovalStatus(value.meta_app_status);
      }

      if (typeof value.phone_verification_status === "string") {
        lifecycle.phoneVerificationStatus =
          value.phone_verification_status.toLowerCase() === "verified"
            ? "verified"
            : value.phone_verification_status.toLowerCase() === "failed"
              ? "failed"
              : "pending";
      }

      if (typeof value.code_verification_status === "string") {
        lifecycle.phoneVerificationStatus =
          value.code_verification_status.toLowerCase() === "verified"
            ? "verified"
            : value.code_verification_status.toLowerCase() === "failed"
              ? "failed"
              : "pending";
      }

      if (typeof value.display_name_status === "string") {
        lifecycle.displayNameReviewStatus =
          value.display_name_status.toLowerCase() === "approved"
            ? "approved"
            : value.display_name_status.toLowerCase() === "rejected"
              ? "rejected"
              : "pending";
      }

      if (typeof value.name_status === "string") {
        lifecycle.displayNameReviewStatus =
          value.name_status.toLowerCase() === "approved"
            ? "approved"
            : value.name_status.toLowerCase() === "rejected"
              ? "rejected"
              : "pending";
      }

      if (typeof value.messaging_limit_tier === "string") {
        lifecycle.messagingLimitTier = value.messaging_limit_tier;
      }

      if (typeof value.current_limit === "string") {
        lifecycle.messagingLimitTier = value.current_limit;
      }

      if (value.business_profile && typeof value.business_profile === "object") {
        const profile = value.business_profile as Record<string, unknown>;
        lifecycle.businessProfileStatus = "synced";
        lifecycle.businessProfile = {
          about: typeof profile.about === "string" ? profile.about : undefined,
          address: typeof profile.address === "string" ? profile.address : undefined,
          description:
            typeof profile.description === "string" ? profile.description : undefined,
          email: typeof profile.email === "string" ? profile.email : undefined,
          vertical: typeof profile.vertical === "string" ? profile.vertical : undefined,
          websites: maybeStringArray(profile.websites),
        };
      }
    }
  }

  return lifecycle;
}

export async function buildWhatsAppIntegrationWritePayload({
  phoneNumberId,
  businessAccountId,
  accessToken,
  appSecret,
  verifyToken,
  enabled,
  existing,
}: {
  phoneNumberId: string;
  businessAccountId: string;
  accessToken?: string;
  appSecret?: string;
  verifyToken?: string;
  enabled: boolean;
  existing?: Doc<"whatsappIntegrations"> | null;
}) {
  const trimmedPhoneNumberId = phoneNumberId.trim();
  const trimmedBusinessAccountId = businessAccountId.trim();
  const accessTokenEncrypted =
    accessToken && accessToken.trim().length > 0
      ? await encryptSecret(accessToken.trim())
      : existing?.accessTokenEncrypted;
  const appSecretEncrypted =
    appSecret && appSecret.trim().length > 0
      ? await encryptSecret(appSecret.trim())
      : existing?.appSecretEncrypted;
  const verifyTokenHash =
    verifyToken && verifyToken.trim().length > 0
      ? await hashSecret(verifyToken.trim())
      : existing?.verifyTokenHash;

  return {
    phoneNumberId: trimmedPhoneNumberId,
    businessAccountId: trimmedBusinessAccountId,
    accessTokenEncrypted,
    appSecretEncrypted,
    verifyTokenHash,
    enabled,
    connectionStatus: deriveWhatsAppConnectionStatus({
      enabled,
      phoneNumberId: trimmedPhoneNumberId,
      businessAccountId: trimmedBusinessAccountId,
      hasAccessToken: Boolean(accessTokenEncrypted),
      hasAppSecret: Boolean(appSecretEncrypted),
      hasVerifyToken: Boolean(verifyTokenHash),
    }),
  };
}

export async function requireWhatsAppIntegrationForOrganization(
  ctx: Pick<QueryCtx, "db"> | Pick<MutationCtx, "db">,
  integrationId: Id<"whatsappIntegrations">,
  organizationId: Id<"organizations">,
) {
  const integration = await ctx.db.get(integrationId);

  if (!integration || integration.organizationId !== organizationId) {
    throw new Error("WhatsApp integration not found for the active organization.");
  }

  return integration;
}

export const getWhatsAppIntegrationState = query({
  args: {},
  handler: async (ctx) => {
    const access = await requireOrgContext(ctx);
    const botProfile = await ctx.db
      .query("botProfiles")
      .withIndex("by_org", (q) => q.eq("organizationId", access.organizationId))
      .first();
    const integration = await ctx.db
      .query("whatsappIntegrations")
      .withIndex("by_org", (q) => q.eq("organizationId", access.organizationId))
      .first();
    const templates = integration
      ? await ctx.db
          .query("whatsappTemplates")
          .withIndex("by_integration", (q) => q.eq("integrationId", integration._id))
          .collect()
      : [];
    const templateSyncLogs = integration
      ? (await ctx.db
          .query("whatsappTemplateSyncLogs")
          .withIndex("by_org_created_at", (q) =>
            q.eq("organizationId", access.organizationId),
          )
          .order("desc")
          .take(20)
        ).filter((item) => item.integrationId === integration._id)
      : [];
    const lifecycleEvents = integration
      ? await ctx.db
          .query("wabaLifecycleEvents")
          .withIndex("by_integration_created_at", (q) =>
            q.eq("integrationId", integration._id),
          )
          .order("desc")
          .take(20)
      : [];

    return {
      role: access.role,
      canManage: access.role === "org:admin",
      botConfigured: Boolean(botProfile),
      linkedBotName: botProfile?.name ?? null,
      state: sanitizeWhatsAppIntegrationForFrontend(integration),
      blockers: deriveLifecycleBlockers(integration),
      templates: templates
        .sort((left, right) => right.updatedAt - left.updatedAt)
        .map((template) => ({
          id: template._id,
          metaTemplateId: template.metaTemplateId ?? null,
          name: template.name,
          languageCode: template.languageCode,
          category: template.category,
          status: template.status,
          rejectionReason: template.rejectionReason ?? null,
          components: template.components,
          lastSyncedAt: template.lastSyncedAt ?? null,
          archivedAt: template.archivedAt ?? null,
          updatedAt: template.updatedAt,
        })),
      templateSyncLogs: templateSyncLogs.map((log) => ({
        id: log._id,
        templateId: log.templateId ?? null,
        status: log.status,
        action: log.action,
        lastError: log.lastError ?? null,
        createdAt: log.createdAt,
      })),
      lifecycleEvents: lifecycleEvents.map((event) => ({
        id: event._id,
        eventType: event.eventType,
        status: event.status,
        details: event.details ?? null,
        createdAt: event.createdAt,
      })),
    };
  },
});

export const getWhatsAppSenderRuntime = internalQuery({
  args: {
    integrationId: v.id("whatsappIntegrations"),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId);

    if (!integration) {
      return null;
    }

    return {
      integrationId: integration._id,
      organizationId: integration.organizationId,
      botId: integration.botId,
      phoneNumberId: integration.phoneNumberId,
      businessAccountId: integration.businessAccountId,
      accessTokenEncrypted: integration.accessTokenEncrypted,
      appSecretEncrypted: integration.appSecretEncrypted,
      enabled: integration.enabled,
      connectionStatus: integration.connectionStatus,
    };
  },
});

export const getApprovedTemplateRuntime = internalQuery({
  args: {
    templateId: v.id("whatsappTemplates"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);

    if (!template || template.status !== "approved") {
      return null;
    }

    return {
      templateId: template._id,
      name: template.name,
      languageCode: template.languageCode,
      components: template.components,
      status: template.status,
    };
  },
});

export const getWhatsAppAdminRuntimeByClerkContext = internalQuery({
  args: {
    clerkOrgId: v.string(),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("orgMembers")
      .withIndex("by_clerk_user_and_org", (q) =>
        q.eq("clerkUserId", args.clerkUserId).eq("clerkOrgId", args.clerkOrgId),
      )
      .first();

    if (!membership) {
      return null;
    }

    const integration = await ctx.db
      .query("whatsappIntegrations")
      .withIndex("by_org", (q) => q.eq("organizationId", membership.orgId))
      .first();

    return {
      organizationId: membership.orgId,
      role: membership.role,
      integrationId: integration?._id ?? null,
      phoneNumberId: integration?.phoneNumberId ?? null,
      businessAccountId: integration?.businessAccountId ?? null,
    };
  },
});

export const saveWhatsAppIntegration = mutation({
  args: {
    phoneNumberId: v.string(),
    businessAccountId: v.string(),
    accessToken: v.optional(v.string()),
    appSecret: v.optional(v.string()),
    verifyToken: v.optional(v.string()),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const access = await assertHasRole(ctx, "org:admin");
    const botProfile = await ctx.db
      .query("botProfiles")
      .withIndex("by_org", (q) => q.eq("organizationId", access.organizationId))
      .first();

    if (!botProfile) {
      throw new Error("Configure Bot Studio before saving WhatsApp integration.");
    }

    const existing = await ctx.db
      .query("whatsappIntegrations")
      .withIndex("by_org", (q) => q.eq("organizationId", access.organizationId))
      .first();

    if (args.enabled && args.phoneNumberId.trim().length === 0) {
      throw new Error("Validation Error: phoneNumberId is required.");
    }

    if (args.enabled && args.businessAccountId.trim().length === 0) {
      throw new Error("Validation Error: businessAccountId is required.");
    }

    const payload = await buildWhatsAppIntegrationWritePayload({
      phoneNumberId: args.phoneNumberId,
      businessAccountId: args.businessAccountId,
      accessToken: args.accessToken,
      appSecret: args.appSecret,
      verifyToken: args.verifyToken,
      enabled: args.enabled,
      existing,
    });

    if (
      args.enabled &&
      (!payload.accessTokenEncrypted ||
        !payload.appSecretEncrypted ||
        !payload.verifyTokenHash)
    ) {
      throw new Error(
        "Validation Error: access token, app secret, and verify token must be configured before enabling the integration.",
      );
    }

    const now = Date.now();
    const integrationId = existing
      ? existing._id
      : await ctx.db.insert("whatsappIntegrations", {
          organizationId: access.organizationId,
          botId: botProfile._id,
          phoneNumberId: payload.phoneNumberId,
        businessAccountId: payload.businessAccountId,
        accessTokenEncrypted: payload.accessTokenEncrypted,
        appSecretEncrypted: payload.appSecretEncrypted,
        verifyTokenHash: payload.verifyTokenHash,
        enabled: payload.enabled,
        connectionStatus: payload.connectionStatus,
        webhookStatus: "pending",
        approvalStatus: "pending",
        phoneVerificationStatus: "missing",
        businessProfileStatus: "pending",
        displayNameReviewStatus: "pending",
        createdAt: now,
        updatedAt: now,
      });

    if (existing) {
      await ctx.db.patch(existing._id, {
        botId: botProfile._id,
        phoneNumberId: payload.phoneNumberId,
        businessAccountId: payload.businessAccountId,
        accessTokenEncrypted: payload.accessTokenEncrypted,
        appSecretEncrypted: payload.appSecretEncrypted,
        verifyTokenHash: payload.verifyTokenHash,
        enabled: payload.enabled,
        connectionStatus: payload.connectionStatus,
        webhookStatus: "pending",
        lastTemplateSyncError: undefined,
        lastLifecycleError: undefined,
        updatedAt: now,
      });
    }

    await ctx.db.insert("auditLogs", {
      orgId: access.organizationId,
      clerkOrgId: access.clerkOrgId,
      userId: access.userId,
      clerkUserId: access.clerkUserId,
      action: "whatsapp_integration_saved",
      details: {
        integrationId,
        enabled: payload.enabled,
        connectionStatus: payload.connectionStatus,
        phoneNumberId: payload.phoneNumberId,
        businessAccountId: payload.businessAccountId,
        accessTokenUpdated: Boolean(args.accessToken),
        appSecretUpdated: Boolean(args.appSecret),
        verifyTokenUpdated: Boolean(args.verifyToken),
      },
      createdAt: now,
    });

    return {
      integrationId,
      connectionStatus: payload.connectionStatus,
    };
  },
});

export const saveWhatsAppTemplate = mutation({
  args: {
    templateId: v.optional(v.id("whatsappTemplates")),
    name: v.string(),
    languageCode: v.string(),
    category: v.union(
      v.literal("marketing"),
      v.literal("utility"),
      v.literal("authentication"),
    ),
    components: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const access = await assertHasRole(ctx, "org:admin");
    const integration = await ctx.db
      .query("whatsappIntegrations")
      .withIndex("by_org", (q) => q.eq("organizationId", access.organizationId))
      .first();

    if (!integration) {
      throw new Error("Configure WhatsApp integration before managing templates.");
    }

    const name = args.name.trim();
    const languageCode = args.languageCode.trim();

    if (!name) {
      throw new Error("Validation Error: template name is required.");
    }

    if (!languageCode) {
      throw new Error("Validation Error: template languageCode is required.");
    }

    const existing = args.templateId ? await ctx.db.get(args.templateId) : null;
    if (existing && existing.organizationId !== access.organizationId) {
      throw new Error("Template not found for the active organization.");
    }

    const now = Date.now();
    const templateId =
      existing?._id ??
      (await ctx.db.insert("whatsappTemplates", {
        organizationId: access.organizationId,
        integrationId: integration._id,
        metaTemplateId: undefined,
        name,
        languageCode,
        category: args.category,
        status: "draft",
        rejectionReason: undefined,
        components: args.components,
        lastSyncedAt: undefined,
        archivedAt: undefined,
        createdAt: now,
        updatedAt: now,
      }));

    if (existing) {
      await ctx.db.patch(existing._id, {
        name,
        languageCode,
        category: args.category,
        components: args.components,
        status: existing.status === "approved" ? "approved" : "draft",
        rejectionReason: undefined,
        updatedAt: now,
      });
    }

    await ctx.db.insert("auditLogs", {
      orgId: access.organizationId,
      userId: access.userId,
      clerkUserId: access.clerkUserId,
      action: existing ? "whatsapp_template_updated" : "whatsapp_template_created",
      details: {
        templateId,
        name,
        languageCode,
        category: args.category,
      },
      createdAt: now,
    });

    return { templateId };
  },
});

export const archiveWhatsAppTemplate = mutation({
  args: {
    templateId: v.id("whatsappTemplates"),
  },
  handler: async (ctx, args) => {
    const access = await assertHasRole(ctx, "org:admin");
    const template = await ctx.db.get(args.templateId);

    if (!template || template.organizationId !== access.organizationId) {
      throw new Error("Template not found for the active organization.");
    }

    const now = Date.now();
    await ctx.db.patch(template._id, {
      status: "archived",
      archivedAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      orgId: access.organizationId,
      userId: access.userId,
      clerkUserId: access.clerkUserId,
      action: "whatsapp_template_archived",
      details: {
        templateId: template._id,
        name: template.name,
      },
      createdAt: now,
    });

    return { templateId: template._id };
  },
});

export const applyTemplateWebhookEventMutation = internalMutation({
  args: {
    eventId: v.id("whatsappWebhookEvents"),
  },
  handler: async (ctx, args) => {
    const webhookEvent = await ctx.db.get(args.eventId);

    if (!webhookEvent?.organizationId || !webhookEvent.integrationId) {
      return { processed: false, reason: "missing_org_or_integration" };
    }

    const organizationId = webhookEvent.organizationId;
    const integrationId = webhookEvent.integrationId;
    const updates = extractTemplateWebhookUpdates(webhookEvent.rawPayload);
    const now = Date.now();
    let processed = 0;

    for (const update of updates) {
      if (!update.name || !update.languageCode) {
        continue;
      }
      const updateName = update.name;
      const updateLanguageCode = update.languageCode;

      const byMetaId = update.metaTemplateId
          ? await ctx.db
              .query("whatsappTemplates")
              .withIndex("by_meta_template_id", (q) =>
                q.eq("metaTemplateId", update.metaTemplateId),
            )
            .first()
        : null;
      const existing =
        byMetaId ??
        (await ctx.db
          .query("whatsappTemplates")
          .withIndex("by_org_name_language", (q) =>
            q
              .eq("organizationId", organizationId)
              .eq("name", updateName)
              .eq("languageCode", updateLanguageCode),
          )
          .first());

      const templateId =
        existing?._id ??
        (await ctx.db.insert("whatsappTemplates", {
          organizationId,
          integrationId,
          metaTemplateId: update.metaTemplateId,
          name: updateName,
          languageCode: updateLanguageCode,
          category: update.category ?? "utility",
          status: update.status,
          rejectionReason: update.rejectionReason,
          components: update.components,
          lastSyncedAt: now,
          archivedAt: undefined,
          createdAt: now,
          updatedAt: now,
        }));

      if (existing) {
        await ctx.db.patch(existing._id, {
          metaTemplateId: update.metaTemplateId ?? existing.metaTemplateId,
          name: updateName,
          languageCode: updateLanguageCode,
          category: update.category ?? existing.category,
          status: update.status,
          rejectionReason: update.rejectionReason,
          components: update.components.length > 0 ? update.components : existing.components,
          lastSyncedAt: now,
          updatedAt: now,
        });
      }

      await ctx.db.insert("whatsappTemplateSyncLogs", {
        organizationId,
        integrationId,
        templateId,
        status: "success",
        action: "pull_status",
        metaResponse: update,
        createdAt: now,
      });

      if (update.status === "rejected") {
        await upsertDashboardNotification(ctx, {
          organizationId,
          type: "template_rejected",
          dedupeKey: `template-rejected:${templateId}:${update.rejectionReason ?? "unknown"}`,
          severity: "warning",
          title: "Template rejected by Meta",
          body:
            update.rejectionReason ??
            `Template ${update.name} (${update.languageCode}) was rejected.`,
          recommendation:
            "Review the rejection reason, update the template copy or components, and sync again.",
        });
      }

      processed += 1;
    }

    const integration = await ctx.db.get(integrationId);
    if (integration) {
      await ctx.db.patch(integration._id, {
        lastTemplateSyncAt: now,
        lastTemplateSyncError: undefined,
        updatedAt: now,
      });
    }

    await ctx.db.patch(webhookEvent._id, {
      processingStatus: "template_processed",
      updatedAt: now,
    });

    return { processed: true, count: processed };
  },
});

export const applyLifecycleWebhookEventMutation = internalMutation({
  args: {
    eventId: v.id("whatsappWebhookEvents"),
  },
  handler: async (ctx, args) => {
    const webhookEvent = await ctx.db.get(args.eventId);

    if (!webhookEvent?.organizationId || !webhookEvent.integrationId) {
      return { processed: false, reason: "missing_org_or_integration" };
    }

    const organizationId = webhookEvent.organizationId;
    const integrationId = webhookEvent.integrationId;
    const lifecycle = extractLifecycleUpdate(webhookEvent.rawPayload);
    const integration = await ctx.db.get(integrationId);

    if (!integration) {
      return { processed: false, reason: "missing_integration" };
    }

    const now = Date.now();
    await ctx.db.patch(integration._id, {
      approvalStatus: lifecycle.approvalStatus ?? integration.approvalStatus,
      phoneVerificationStatus:
        lifecycle.phoneVerificationStatus ?? integration.phoneVerificationStatus,
      businessProfileStatus:
        lifecycle.businessProfileStatus ?? integration.businessProfileStatus,
      displayNameReviewStatus:
        lifecycle.displayNameReviewStatus ?? integration.displayNameReviewStatus,
      messagingLimitTier: lifecycle.messagingLimitTier ?? integration.messagingLimitTier,
      businessProfile: lifecycle.businessProfile ?? integration.businessProfile,
      lastLifecycleRefreshAt: now,
      lastLifecycleError: undefined,
      lastPhoneVerificationAt: lifecycle.phoneVerificationStatus ? now : integration.lastPhoneVerificationAt,
      updatedAt: now,
    });

    const events: Array<{
      eventType:
        | "meta_app_approval"
        | "phone_verification"
        | "business_profile_sync"
        | "display_name_review"
        | "messaging_tier";
      status: string;
      details?: unknown;
    }> = [];

    if (lifecycle.approvalStatus) {
      events.push({
        eventType: "meta_app_approval",
        status: lifecycle.approvalStatus,
        details: { field: lifecycle.rawField },
      });
    }

    if (lifecycle.phoneVerificationStatus) {
      events.push({
        eventType: "phone_verification",
        status: lifecycle.phoneVerificationStatus,
      });
    }

    if (lifecycle.businessProfileStatus) {
      events.push({
        eventType: "business_profile_sync",
        status: lifecycle.businessProfileStatus,
        details: lifecycle.businessProfile,
      });
    }

    if (lifecycle.displayNameReviewStatus) {
      events.push({
        eventType: "display_name_review",
        status: lifecycle.displayNameReviewStatus,
      });
    }

    if (lifecycle.messagingLimitTier) {
      events.push({
        eventType: "messaging_tier",
        status: lifecycle.messagingLimitTier,
      });
    }

    for (const event of events) {
      await ctx.db.insert("wabaLifecycleEvents", {
        organizationId,
        integrationId,
        eventType: event.eventType,
        status: event.status,
        details: event.details,
        createdAt: now,
      });
    }

    const blockers = deriveLifecycleBlockers({
      ...integration,
      approvalStatus: lifecycle.approvalStatus ?? integration.approvalStatus,
      phoneVerificationStatus:
        lifecycle.phoneVerificationStatus ?? integration.phoneVerificationStatus,
      businessProfileStatus:
        lifecycle.businessProfileStatus ?? integration.businessProfileStatus,
    });
    if (blockers.length > 0) {
      await upsertDashboardNotification(ctx, {
        organizationId,
        type: "waba_action_required",
        dedupeKey: `waba-action-required:${integration._id}:${blockers.join(",")}`,
        severity: "warning",
        title: "WhatsApp production blockers detected",
        body: blockers.join(", "),
        recommendation:
          "Finish Meta approval, phone verification, and business profile sync before production enablement.",
      });
    }

    await ctx.db.patch(webhookEvent._id, {
      processingStatus: "lifecycle_processed",
      updatedAt: now,
    });

    return {
      processed: true,
      blockers,
    };
  },
});

export const syncTemplatesFromMetaMutation = internalMutation({
  args: {
    integrationId: v.id("whatsappIntegrations"),
    templates: v.array(
      v.object({
        metaTemplateId: v.optional(v.string()),
        name: v.string(),
        languageCode: v.string(),
        category: v.union(
          v.literal("marketing"),
          v.literal("utility"),
          v.literal("authentication"),
        ),
        status: v.union(
          v.literal("draft"),
          v.literal("pending"),
          v.literal("approved"),
          v.literal("rejected"),
          v.literal("paused"),
          v.literal("disabled"),
          v.literal("archived"),
        ),
        rejectionReason: v.optional(v.string()),
        components: v.array(v.any()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId);

    if (!integration) {
      throw new Error("WhatsApp integration not found.");
    }

    const now = Date.now();
    let count = 0;

    for (const template of args.templates) {
      const existing =
        (template.metaTemplateId
          ? await ctx.db
              .query("whatsappTemplates")
              .withIndex("by_meta_template_id", (q) =>
                q.eq("metaTemplateId", template.metaTemplateId),
              )
              .first()
          : null) ??
        (await ctx.db
          .query("whatsappTemplates")
          .withIndex("by_org_name_language", (q) =>
            q
              .eq("organizationId", integration.organizationId)
              .eq("name", template.name)
              .eq("languageCode", template.languageCode),
          )
          .first());

      const templateId =
        existing?._id ??
        (await ctx.db.insert("whatsappTemplates", {
          organizationId: integration.organizationId,
          integrationId: integration._id,
          metaTemplateId: template.metaTemplateId,
          name: template.name,
          languageCode: template.languageCode,
          category: template.category,
          status: template.status,
          rejectionReason: template.rejectionReason,
          components: template.components,
          lastSyncedAt: now,
          archivedAt: undefined,
          createdAt: now,
          updatedAt: now,
        }));

      if (existing) {
        await ctx.db.patch(existing._id, {
          metaTemplateId: template.metaTemplateId ?? existing.metaTemplateId,
          name: template.name,
          languageCode: template.languageCode,
          category: template.category,
          status: template.status,
          rejectionReason: template.rejectionReason,
          components: template.components,
          lastSyncedAt: now,
          updatedAt: now,
        });
      }

      await ctx.db.insert("whatsappTemplateSyncLogs", {
        organizationId: integration.organizationId,
        integrationId: integration._id,
        templateId,
        status: "success",
        action: "pull_status",
        metaResponse: template,
        createdAt: now,
      });

      count += 1;
    }

    await ctx.db.patch(integration._id, {
      lastTemplateSyncAt: now,
      lastTemplateSyncError: undefined,
      updatedAt: now,
    });

    return { count };
  },
});

export const recordWhatsAppSyncFailureMutation = internalMutation({
  args: {
    integrationId: v.id("whatsappIntegrations"),
    target: v.union(v.literal("templates"), v.literal("lifecycle")),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId);

    if (!integration) {
      return { recorded: false };
    }

    await ctx.db.patch(integration._id, {
      lastTemplateSyncError:
        args.target === "templates" ? args.message : integration.lastTemplateSyncError,
      lastLifecycleError:
        args.target === "lifecycle" ? args.message : integration.lastLifecycleError,
      updatedAt: Date.now(),
    });

    return { recorded: true };
  },
});

export const applyLifecycleRefreshMutation = internalMutation({
  args: {
    integrationId: v.id("whatsappIntegrations"),
    approvalStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
        v.literal("action_required"),
      ),
    ),
    phoneVerificationStatus: v.optional(
      v.union(
        v.literal("missing"),
        v.literal("pending"),
        v.literal("verified"),
        v.literal("failed"),
      ),
    ),
    businessProfileStatus: v.optional(
      v.union(v.literal("pending"), v.literal("synced"), v.literal("failed")),
    ),
    displayNameReviewStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
      ),
    ),
    messagingLimitTier: v.optional(v.string()),
    businessProfile: v.optional(
      v.object({
        about: v.optional(v.string()),
        address: v.optional(v.string()),
        description: v.optional(v.string()),
        email: v.optional(v.string()),
        vertical: v.optional(v.string()),
        websites: v.optional(v.array(v.string())),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId);

    if (!integration) {
      throw new Error("WhatsApp integration not found.");
    }

    const now = Date.now();
    await ctx.db.patch(integration._id, {
      approvalStatus: args.approvalStatus ?? integration.approvalStatus,
      phoneVerificationStatus:
        args.phoneVerificationStatus ?? integration.phoneVerificationStatus,
      businessProfileStatus:
        args.businessProfileStatus ?? integration.businessProfileStatus,
      displayNameReviewStatus:
        args.displayNameReviewStatus ?? integration.displayNameReviewStatus,
      messagingLimitTier: args.messagingLimitTier ?? integration.messagingLimitTier,
      businessProfile: args.businessProfile ?? integration.businessProfile,
      lastLifecycleRefreshAt: now,
      lastLifecycleError: undefined,
      updatedAt: now,
    });

    return { refreshed: true };
  },
});
