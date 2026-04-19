import { httpRouter } from "convex/server";
import { Webhook } from "svix";
import { internal } from "./_generated/api.js";
import { httpAction } from "./_generated/server.js";

const http = httpRouter();

type ClerkWebhookEvent = {
  type: string;
  data: {
    id?: string | null;
    name?: string | null;
    slug?: string | null;
    image_url?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    role?: string | null;
    email_addresses?: Array<{
      email_address?: string | null;
    }> | null;
    public_user_data?: {
      user_id?: string | null;
    } | null;
    organization?: {
      id?: string | null;
    } | null;
  };
};

function getRequiredHeader(headers: Headers, name: string) {
  const value = headers.get(name);

  if (!value) {
    throw new Error(`Missing Clerk webhook header: ${name}`);
  }

  return value;
}

function getBearerToken(headers: Headers) {
  const authorization = headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length);
}

function requireSharedSecret(request: Request) {
  const expected = process.env.CONVEX_SHARED_SECRET;

  if (!expected) {
    console.error("CONVEX_SHARED_SECRET is not configured.");
    return new Response("Webhook configuration error", { status: 500 });
  }

  const actual = getBearerToken(request.headers);
  if (!actual || actual !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  return null;
}

http.route({
  path: "/clerk",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.CLERK_WEBHOOK_SECRET;

    if (!secret) {
      console.error("CLERK_WEBHOOK_SECRET is not configured.");
      return new Response("Webhook configuration error", { status: 500 });
    }

    const payload = await request.text();

    let event: ClerkWebhookEvent;
    try {
      const webhook = new Webhook(secret);
      event = webhook.verify(payload, {
        "svix-id": getRequiredHeader(request.headers, "svix-id"),
        "svix-timestamp": getRequiredHeader(request.headers, "svix-timestamp"),
        "svix-signature": getRequiredHeader(request.headers, "svix-signature"),
      }) as ClerkWebhookEvent;
    } catch (error) {
      console.error("Clerk webhook signature verification failed", error);
      return new Response("Webhook Error", { status: 400 });
    }

    try {
      switch (event.type) {
        case "user.created":
        case "user.updated":
          await ctx.runMutation(internal.users.syncUser, {
            clerkId: String(event.data.id),
            email: event.data.email_addresses?.[0]?.email_address ?? "",
            firstName: event.data.first_name ?? undefined,
            lastName: event.data.last_name ?? undefined,
            imageUrl: event.data.image_url ?? undefined,
          });
          break;
        case "user.deleted":
          if (event.data.id) {
            await ctx.runMutation(internal.users.deleteUser, {
              clerkId: String(event.data.id),
            });
          }
          break;
        case "organization.created":
        case "organization.updated":
          await ctx.runMutation(internal.users.syncOrganization, {
            clerkOrgId: String(event.data.id),
            name: String(event.data.name ?? ""),
            slug: event.data.slug ?? undefined,
            imageUrl: event.data.image_url ?? undefined,
          });
          break;
        case "organization.deleted":
          if (event.data.id) {
            await ctx.runMutation(internal.users.deleteOrganization, {
              clerkOrgId: String(event.data.id),
            });
          }
          break;
        case "organizationMembership.created":
        case "organizationMembership.updated":
          if (event.data.public_user_data?.user_id && event.data.organization?.id) {
            await ctx.runMutation(internal.users.syncOrgMembership, {
              clerkUserId: String(event.data.public_user_data.user_id),
              clerkOrgId: String(event.data.organization.id),
              role: String(event.data.role ?? "org:member"),
            });
          }
          break;
        case "organizationMembership.deleted":
          if (event.data.public_user_data?.user_id && event.data.organization?.id) {
            await ctx.runMutation(internal.users.removeOrgMembership, {
              clerkUserId: String(event.data.public_user_data.user_id),
              clerkOrgId: String(event.data.organization.id),
            });
          }
          break;
        default:
          break;
      }

      return new Response(null, { status: 200 });
    } catch (error) {
      console.error("Clerk webhook processing failed", error);
      return new Response("Webhook processing failed", { status: 500 });
    }
  }),
});

http.route({
  path: "/internal/whatsapp/webhook-events",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authFailure = requireSharedSecret(request);
    if (authFailure) {
      return authFailure;
    }

    try {
      const payload = (await request.json()) as {
        receivedAt: number;
        eventKey: string;
        eventType: string;
        rawPayload: string;
        signatureValid: boolean;
        phoneNumberId?: string;
        businessAccountId?: string;
        providerEventId?: string;
        mediaDownloadEnqueued: boolean;
        mediaDownloadPriority: "normal" | "high";
        mediaDownloadDeadlineAt?: number;
      };

      const result = await ctx.runMutation(
        internal.whatsappWebhookEvents.storeRawWhatsappEvent,
        payload,
      );

      return Response.json(result, { status: 200 });
    } catch (error) {
      console.error("WhatsApp raw event storage failed", error);
      return new Response("Webhook processing failed", { status: 500 });
    }
  }),
});

http.route({
  path: "/internal/whatsapp/webhook-verified",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authFailure = requireSharedSecret(request);
    if (authFailure) {
      return authFailure;
    }

    try {
      const payload = (await request.json()) as {
        verifyToken: string;
        verifiedAt: number;
      };
      const result = await ctx.runMutation(
        internal.whatsappWebhookEvents.markWebhookVerified,
        payload,
      );

      return Response.json(result, { status: 200 });
    } catch (error) {
      console.error("WhatsApp verification tracking failed", error);
      return new Response("Webhook processing failed", { status: 500 });
    }
  }),
});

export default http;
