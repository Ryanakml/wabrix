import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "./_generated/server.js";
import { mutation, query } from "./_generated/server.js";
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
  };
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

    return {
      role: access.role,
      canManage: access.role === "org:admin",
      botConfigured: Boolean(botProfile),
      linkedBotName: botProfile?.name ?? null,
      state: sanitizeWhatsAppIntegrationForFrontend(integration),
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
