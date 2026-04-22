"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api.js";
import { action, type ActionCtx } from "./_generated/server.js";
import type { Id } from "./_generated/dataModel.js";
import { decryptSecret } from "./lib/crypto.js";

function getGraphApiBaseUrl() {
  return (
    process.env.WHATSAPP_GRAPH_API_BASE_URL?.replace(/\/$/, "") ??
    "https://graph.facebook.com/v23.0"
  );
}

type AdminRuntime = {
  organizationId: string;
  role: string;
  integrationId: Id<"whatsappIntegrations">;
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
};

async function loadAdminRuntime(ctx: ActionCtx): Promise<AdminRuntime> {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Unauthorized");
  }

  const clerkOrgId = (identity as Record<string, unknown>).org_id;
  if (typeof clerkOrgId !== "string" || !clerkOrgId) {
    throw new Error("No active organization context.");
  }

  const adminState = await ctx.runQuery(
    internal.whatsapp.getWhatsAppAdminRuntimeByClerkContext,
    {
      clerkOrgId,
      clerkUserId: identity.subject,
    },
  );

  if (!adminState || adminState.role !== "org:admin" || !adminState.integrationId) {
    throw new Error("WhatsApp admin access is required.");
  }

  const runtime = await ctx.runQuery(internal.whatsapp.getWhatsAppSenderRuntime, {
    integrationId: adminState.integrationId as never,
  });

  if (!runtime || !runtime.accessTokenEncrypted) {
    throw new Error("WhatsApp access token is not configured.");
  }

  const accessToken = await decryptSecret(runtime.accessTokenEncrypted);

  if (!accessToken) {
    throw new Error("WhatsApp access token could not be decrypted.");
  }

  return {
    organizationId: adminState.organizationId,
    role: adminState.role,
    integrationId: runtime.integrationId,
    phoneNumberId: runtime.phoneNumberId,
    businessAccountId: runtime.businessAccountId,
    accessToken,
  };
}

function mapTemplateCategory(rawCategory?: string) {
  const normalized = rawCategory?.toLowerCase();
  if (normalized === "marketing" || normalized === "authentication") {
    return normalized;
  }

  return "utility" as const;
}

function mapTemplateStatus(rawStatus?: string) {
  const normalized = rawStatus?.toLowerCase();
  if (normalized === "approved" || normalized === "active") {
    return "approved" as const;
  }

  if (normalized === "pending" || normalized === "in_review") {
    return "pending" as const;
  }

  if (normalized === "rejected") {
    return "rejected" as const;
  }

  if (normalized === "paused") {
    return "paused" as const;
  }

  if (normalized === "disabled") {
    return "disabled" as const;
  }

  if (normalized === "archived") {
    return "archived" as const;
  }

  return "draft" as const;
}

export const syncWhatsAppTemplates = action({
  args: {},
  handler: async (ctx): Promise<{ count: number }> => {
    const runtime = await loadAdminRuntime(ctx);

    try {
      const response = await fetch(
        `${getGraphApiBaseUrl()}/${runtime.businessAccountId}/message_templates`,
        {
          headers: {
            Authorization: `Bearer ${runtime.accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Template sync failed with status ${response.status}`);
      }

      const payload = (await response.json()) as {
        data?: Array<{
          id?: string;
          name?: string;
          language?: string;
          category?: string;
          status?: string;
          rejected_reason?: string;
          components?: unknown[];
        }>;
      };
      const templates:
        Array<{
          metaTemplateId?: string;
          name: string;
          languageCode: string;
          category: "marketing" | "utility" | "authentication";
          status: "draft" | "pending" | "approved" | "rejected" | "paused" | "disabled" | "archived";
          rejectionReason?: string;
          components: unknown[];
        }> =
        payload.data
          ?.filter(
            (template): template is NonNullable<typeof payload.data>[number] & {
              name: string;
              language: string;
            } => Boolean(template.name && template.language),
          )
          .map((template) => ({
            metaTemplateId: template.id,
            name: template.name,
            languageCode: template.language,
            category: mapTemplateCategory(template.category),
            status: mapTemplateStatus(template.status),
            rejectionReason: template.rejected_reason,
            components: Array.isArray(template.components) ? template.components : [],
          })) ?? [];

      return ctx.runMutation(internal.whatsapp.syncTemplatesFromMetaMutation, {
        integrationId: runtime.integrationId,
        templates,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await ctx.runMutation(internal.whatsapp.recordWhatsAppSyncFailureMutation, {
        integrationId: runtime.integrationId,
        target: "templates",
        message,
      });
      throw error;
    }
  },
});

export const refreshWhatsAppLifecycle = action({
  args: {},
  handler: async (ctx): Promise<{ refreshed: boolean }> => {
    const runtime = await loadAdminRuntime(ctx);

    try {
      const [phoneResponse, profileResponse] = await Promise.all([
        fetch(
          `${getGraphApiBaseUrl()}/${runtime.phoneNumberId}?fields=code_verification_status,name_status,verified_name_status,quality_rating`,
          {
            headers: {
              Authorization: `Bearer ${runtime.accessToken}`,
            },
          },
        ),
        fetch(
          `${getGraphApiBaseUrl()}/${runtime.phoneNumberId}/whatsapp_business_profile`,
          {
            headers: {
              Authorization: `Bearer ${runtime.accessToken}`,
            },
          },
        ),
      ]);

      const phonePayload = phoneResponse.ok
        ? ((await phoneResponse.json()) as Record<string, unknown>)
        : {};
      const profilePayload = profileResponse.ok
        ? ((await profileResponse.json()) as
            | { data?: Array<Record<string, unknown>> }
            | Record<string, unknown>)
        : {};
      const profile =
        "data" in profilePayload && Array.isArray(profilePayload.data)
          ? profilePayload.data[0]
          : (profilePayload as Record<string, unknown>);

      return ctx.runMutation(internal.whatsapp.applyLifecycleRefreshMutation, {
        integrationId: runtime.integrationId,
        phoneVerificationStatus:
          typeof phonePayload.code_verification_status === "string"
            ? phonePayload.code_verification_status.toLowerCase() === "verified"
              ? "verified"
              : phonePayload.code_verification_status.toLowerCase() === "failed"
                ? "failed"
                : "pending"
            : undefined,
        displayNameReviewStatus:
          typeof phonePayload.name_status === "string"
            ? phonePayload.name_status.toLowerCase() === "approved"
              ? "approved"
              : phonePayload.name_status.toLowerCase() === "rejected"
                ? "rejected"
                : "pending"
            : undefined,
        businessProfileStatus: Object.keys(profile ?? {}).length > 0 ? "synced" : undefined,
        businessProfile:
          profile && typeof profile === "object"
            ? {
                about:
                  typeof profile.about === "string" ? profile.about : undefined,
                address:
                  typeof profile.address === "string" ? profile.address : undefined,
                description:
                  typeof profile.description === "string"
                    ? profile.description
                    : undefined,
                email:
                  typeof profile.email === "string" ? profile.email : undefined,
                vertical:
                  typeof profile.vertical === "string" ? profile.vertical : undefined,
                websites: Array.isArray(profile.websites)
                  ? profile.websites.filter(
                      (item: unknown): item is string => typeof item === "string",
                    )
                  : undefined,
              }
            : undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await ctx.runMutation(internal.whatsapp.recordWhatsAppSyncFailureMutation, {
        integrationId: runtime.integrationId,
        target: "lifecycle",
        message,
      });
      throw error;
    }
  },
});

export const requestPhoneVerificationCode = action({
  args: {
    method: v.union(v.literal("SMS"), v.literal("VOICE")),
    languageCode: v.string(),
  },
  handler: async (ctx, args): Promise<unknown> => {
    const runtime = await loadAdminRuntime(ctx);

    const response: Response = await fetch(
      `${getGraphApiBaseUrl()}/${runtime.phoneNumberId}/request_code`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${runtime.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code_method: args.method,
          language: args.languageCode,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Phone verification request failed with status ${response.status}`);
    }

    await ctx.runMutation(internal.whatsapp.applyLifecycleRefreshMutation, {
      integrationId: runtime.integrationId,
      phoneVerificationStatus: "pending",
    });

    return response.json();
  },
});

export const verifyPhoneVerificationCode = action({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args): Promise<unknown> => {
    const runtime = await loadAdminRuntime(ctx);

    const response = await fetch(
      `${getGraphApiBaseUrl()}/${runtime.phoneNumberId}/verify_code`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${runtime.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: args.code,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Phone verification confirm failed with status ${response.status}`);
    }

    await ctx.runMutation(internal.whatsapp.applyLifecycleRefreshMutation, {
      integrationId: runtime.integrationId,
      phoneVerificationStatus: "verified",
    });

    return response.json();
  },
});
