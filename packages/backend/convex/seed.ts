import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🌱 Starting Seed Script...");

    const now = Date.now();

    // 1. Get or Create Organization
    let org = await ctx.db.query("organizations").first();
    let orgId;
    if (!org) {
      orgId = await ctx.db.insert("organizations", {
        clerkOrgId: "dummy_org_123",
        name: "Playground Org",
        slug: "playground",
        createdAt: now,
        updatedAt: now,
      });
      console.log("Created dummy organization");
    } else {
      orgId = org._id;
      console.log("Using existing organization");
    }

    // 2. Get or Create User
    let user = await ctx.db.query("users").first();
    let userId;
    let clerkUserId = "dummy_user_123";
    let userName = "Admin User";
    if (!user) {
      userId = await ctx.db.insert("users", {
        clerkId: clerkUserId,
        email: "admin@playground.local",
        firstName: "Admin",
        lastName: "User",
        createdAt: now,
        updatedAt: now,
      });
      console.log("Created dummy user");
    } else {
      userId = user._id;
      clerkUserId = user.clerkId;
      userName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : "Admin User";
      console.log("Using existing user");
    }

    // 3. Bot Studio
    const botId = await ctx.db.insert("botProfiles", {
      organizationId: orgId,
      name: "Customer Support Bot",
      defaultLanguage: "en",
      systemPrompt: "You are a helpful customer support bot.",
      localizedPromptTemplates: { en: "Hello!", id: "Halo!" },
      modelPolicy: { primaryModel: "gpt-4o-mini" },
      escalationSettings: { enabled: true, handoffMessage: "Transferring you to a human agent..." },
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("promptVersions", {
      organizationId: orgId,
      botId: botId,
      systemPrompt: "You are a helpful customer support bot.",
      localizedPromptTemplates: { en: "Hello!", id: "Halo!" },
      createdAt: now,
    });
    console.log("Created bot profile");

    // 4. WhatsApp Setup
    const integrationId = await ctx.db.insert("whatsappIntegrations", {
      organizationId: orgId,
      botId: botId,
      phoneNumberId: "1234567890",
      businessAccountId: "0987654321",
      enabled: true,
      connectionStatus: "configured",
      webhookStatus: "verified",
      approvalStatus: "approved",
      messagingLimitTier: "1K",
      businessProfile: {
        about: "We are a dummy business.",
        description: "Testing SaaS UI",
      },
      createdAt: now,
      updatedAt: now,
    });
    console.log("Created WhatsApp integration");

    // 5. Knowledge Base
    const sources = [
      { title: "Refund Policy", status: "ready" },
      { title: "Pricing Details", status: "processing" },
      { title: "FAQ", status: "ready" },
      { title: "Draft Guide", status: "deferred" },
    ];

    for (const s of sources) {
      await ctx.db.insert("knowledgeSources", {
        organizationId: orgId,
        botId: botId,
        title: s.title,
        sourceType: "inline",
        status: s.status as any,
        sourceVendor: "inline",
        originalFormat: "markdown",
        markdownContent: "Dummy content for " + s.title,
        chunkCount: s.status === "ready" ? 5 : 0,
        lastIngestedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }
    console.log("Created knowledge base entries");

    // 6. Inbox (Contacts, Conversations, Messages)
    const statuses = [
      { status: "open", botPaused: false, botReplyState: "idle" },
      { status: "open", botPaused: true, botReplyState: "blocked" },
      { status: "open", botPaused: false, botReplyState: "queued" },
      { status: "closed", botPaused: false, botReplyState: "idle" },
    ];
    
    for (let i = 0; i < 4; i++) {
      const isExpired = i === 3;
      const contactId = await ctx.db.insert("whatsappContacts", {
        organizationId: orgId,
        integrationId: integrationId,
        botId: botId,
        waId: `628123456789${i}`,
        profileName: `Customer ${i + 1}`,
        optOut: false,
        lastInboundAt: now - (i * 1000000),
        serviceWindowExpiresAt: isExpired ? now - 100000 : now + 86400000,
        createdAt: now,
        updatedAt: now,
      });

      const s = statuses[i % statuses.length] ?? statuses[0]!;
      const conversationId = await ctx.db.insert("conversations", {
        organizationId: orgId,
        channel: "whatsapp",
        contactId: contactId,
        assignedUserId: i % 2 === 0 ? userId : undefined,
        assignedClerkUserId: i % 2 === 0 ? clerkUserId : undefined,
        assignedUserName: i % 2 === 0 ? userName : undefined,
        status: s.status as any,
        handoffRequested: i === 1,
        botPaused: s.botPaused as boolean,
        botReplyState: s.botReplyState as any,
        serviceWindowExpiresAt: isExpired ? now - 100000 : now + 86400000,
        serviceWindowExpiringSoon: i === 2,
        lastMessageAt: now - (i * 10000),
        lastInboundAt: now - (i * 20000),
        lastMessagePreview: "Can you help me with my order?",
        createdAt: now - (i * 100000),
        updatedAt: now,
      });

      await ctx.db.patch(contactId, { activeConversationId: conversationId });

      // Messages
      await ctx.db.insert("messages", {
        organizationId: orgId,
        conversationId: conversationId,
        role: "user",
        source: "whatsapp",
        content: "Hello! I have a question.",
        contentType: "text",
        deliveryState: "received",
        createdAt: now - 50000,
        updatedAt: now - 50000,
      });

      await ctx.db.insert("messages", {
        organizationId: orgId,
        conversationId: conversationId,
        role: "assistant",
        source: "bot",
        content: "Hi there! How can I help you today?",
        contentType: "text",
        deliveryState: "delivered",
        createdAt: now - 40000,
        updatedAt: now - 40000,
      });

      await ctx.db.insert("messages", {
        organizationId: orgId,
        conversationId: conversationId,
        role: "user",
        source: "whatsapp",
        content: "Can you help me with my order?",
        contentType: "text",
        deliveryState: "received",
        createdAt: now - 10000,
        updatedAt: now - 10000,
      });

      // Internal Note
      if (i === 1) {
        await ctx.db.insert("conversationNotes", {
          organizationId: orgId,
          conversationId: conversationId,
          authorUserId: userId,
          authorClerkUserId: clerkUserId,
          authorDisplayName: userName,
          body: "Customer requested human agent. Please handle ASAP.",
          createdAt: now,
          updatedAt: now,
        });
      }

      // Outbound Queue (pending)
      if (i === 2) {
        const outMsgId = await ctx.db.insert("messages", {
          organizationId: orgId,
          conversationId: conversationId,
          role: "assistant",
          source: "user",
          content: "I am checking your order status now.",
          contentType: "text",
          deliveryState: "queued",
          createdAt: now,
          updatedAt: now,
        });

        const waMsgId = await ctx.db.insert("whatsappMessages", {
          organizationId: orgId,
          integrationId: integrationId,
          conversationId: conversationId,
          contactId: contactId,
          transcriptMessageId: outMsgId,
          providerMessageId: `wamid.dummy.${Date.now()}`,
          waId: `628123456789${i}`,
          direction: "outbound",
          messageType: "text",
          transportStatus: "queued",
          createdAt: now,
          updatedAt: now,
        });

        await ctx.db.insert("outboundQueue", {
          organizationId: orgId,
          integrationId: integrationId,
          conversationId: conversationId,
          contactId: contactId,
          channel: "whatsapp",
          messageId: outMsgId,
          whatsappMessageId: waMsgId,
          idempotencyKey: `idem_${Date.now()}`,
          payloadType: "text",
          requiresOpenServiceWindow: true,
          status: "queued",
          attemptCount: 0,
          maxAttempts: 3,
          nextAttemptAt: now + 5000,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    console.log("Created inbox conversations and messages");

    // 7. Analytics / Usage Counters
    // Seed current month
    const d = new Date();
    const periodKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const periodStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);

    await ctx.db.insert("usageCounters", {
      organizationId: orgId,
      periodKey: periodKey,
      periodStart: periodStart,
      aiRunCount: 150,
      aiPromptTokens: 25000,
      aiCompletionTokens: 5000,
      aiTotalTokens: 30000,
      aiEstimatedCostUsd: 0.55,
      inboundMessageCount: 320,
      outboundMessageCount: 305,
      outboundTemplateMessageCount: 10,
      deliverySentCount: 315,
      deliveryDeliveredCount: 310,
      deliveryReadCount: 290,
      deliveryFailedCount: 2,
      queueFailureCount: 1,
      mediaProcessedCount: 15,
      createdAt: now,
      updatedAt: now,
    });
    
    // Previous month
    const prevMonth = d.getUTCMonth() === 0 ? 11 : d.getUTCMonth() - 1;
    const prevYear = d.getUTCMonth() === 0 ? d.getUTCFullYear() - 1 : d.getUTCFullYear();
    const prevPeriodKey = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;
    const prevPeriodStart = Date.UTC(prevYear, prevMonth, 1);
    
    await ctx.db.insert("usageCounters", {
      organizationId: orgId,
      periodKey: prevPeriodKey,
      periodStart: prevPeriodStart,
      aiRunCount: 120,
      aiPromptTokens: 18000,
      aiCompletionTokens: 3000,
      aiTotalTokens: 21000,
      aiEstimatedCostUsd: 0.40,
      inboundMessageCount: 280,
      outboundMessageCount: 270,
      outboundTemplateMessageCount: 5,
      deliverySentCount: 275,
      deliveryDeliveredCount: 270,
      deliveryReadCount: 250,
      deliveryFailedCount: 1,
      queueFailureCount: 0,
      mediaProcessedCount: 10,
      createdAt: now - 30 * 24 * 60 * 60 * 1000,
      updatedAt: now - 30 * 24 * 60 * 60 * 1000,
    });
    console.log("Created usage counters");

    console.log("✅ Seed completed successfully!");
  },
});
