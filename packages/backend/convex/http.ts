import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { Webhook } from "svix";

const http = httpRouter();

http.route({
  path: "/clerk",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payloadString = await request.text();
    const headerPayload = request.headers;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type WebhookEvent = { type: string; data: Record<string, any> };
    let evt: WebhookEvent;
    try {
      if (process.env.CLERK_WEBHOOK_SECRET) {
        const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
        evt = wh.verify(payloadString, {
          "svix-id": headerPayload.get("svix-id")!,
          "svix-timestamp": headerPayload.get("svix-timestamp")!,
          "svix-signature": headerPayload.get("svix-signature")!,
        }) as WebhookEvent;
      } else {
        // Fallback for local development if secret is not set yet
        console.warn("⚠️ Missing CLERK_WEBHOOK_SECRET. Proceeding without verification.");
        evt = JSON.parse(payloadString);
      }
    } catch (err) {
      console.error("Webhook signature verification failed", err);
      return new Response("Webhook Error", { status: 400 });
    }

    try {
      const eventType = evt.type;

      if (eventType === "user.created" || eventType === "user.updated") {
        await ctx.runMutation(internal.users.syncUser, {
          clerkId: evt.data.id,
          email: evt.data.email_addresses?.[0]?.email_address || "",
          firstName: evt.data.first_name || undefined,
          lastName: evt.data.last_name || undefined,
          imageUrl: evt.data.image_url,
        });
      }

      if (eventType === "user.deleted" && evt.data.id) {
        await ctx.runMutation(internal.users.deleteUser, {
          clerkId: evt.data.id,
        });
      }

      if (eventType === "organization.created" || eventType === "organization.updated") {
        await ctx.runMutation(internal.users.syncOrganization, {
          clerkOrgId: evt.data.id,
          name: evt.data.name,
          slug: evt.data.slug || undefined,
          imageUrl: evt.data.image_url,
        });
      }

      if (eventType === "organization.deleted" && evt.data.id) {
        await ctx.runMutation(internal.users.deleteOrganization, {
          clerkOrgId: evt.data.id,
        });
      }

      if (eventType === "organizationMembership.created" || eventType === "organizationMembership.updated") {
        if (evt.data.public_user_data?.user_id) {
          await ctx.runMutation(internal.users.syncOrgMembership, {
            clerkUserId: evt.data.public_user_data.user_id,
            clerkOrgId: evt.data.organization.id,
            role: evt.data.role,
          });
        }
      }

      if (eventType === "organizationMembership.deleted") {
        if (evt.data.public_user_data?.user_id) {
          await ctx.runMutation(internal.users.removeOrgMembership, {
            clerkUserId: evt.data.public_user_data.user_id,
            clerkOrgId: evt.data.organization.id,
          });
        }
      }

      return new Response(null, { status: 200 });
    } catch (err) {
      console.error("Webhook processing failed", err);
      return new Response("Webhook processing failed", { status: 500 });
    }
  }),
});

export default http;
