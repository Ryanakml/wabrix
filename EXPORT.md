# wabrix — Comprehensive Export Document

> This document serves as the complete context for building landing pages, marketing materials, and understanding the product.

---

## 1. Product Identity

**Name:** wabrix

**Tagline:** Revenue-grade WhatsApp ops

**Product Hook:** The premium WhatsApp AI workspace for teams that need automation without chaos.

**Core Promise:** Wabrix combines compliant WhatsApp delivery, AI-assisted replies, human handoff, billing control, and analytics in one product that is actually built for operations, not demos.

---

## 2. What wabrix Is

**wabrix** is a production-oriented **WhatsApp AI SaaS** built as a robust pnpm monorepo with Turborepo. It enables businesses to:

- Connect WhatsApp Business numbers securely
- Configure AI-powered bot responses with custom prompts
- Ingest business knowledge from text, PDFs, and websites
- Manage conversations through an operator inbox with human handoff
- Handle WhatsApp template workflows and compliance
- Route billing by geography (Indonesia → Midtrans IDR, Global → Polar USD)
- Track analytics and usage with operational visibility

**WhatsApp-First, AI-Powered:** WhatsApp is the transport layer. Bot behavior is driven by admin-managed prompts, model configuration, RAG (Retrieval-Augmented Generation), and conversation context.

---

## 3. Target Users (Personas)

| Role | Primary Use | Key Needs |
|------|-------------|-----------|
| **Business Owner** | Setup bot, configure billing | Simplicity, compliance, cost clarity |
| **Admin** | Configure bot, WhatsApp, templates, knowledge | Control, flexibility, audit trails |
| **Agent** | Work in inbox, handle handoff | Context, speed, visibility, handoff tools |
| **Viewer** | Inspect conversations and analytics | Read-only access, dashboards |
| **End Customer** | Message the business via WhatsApp | Fast, accurate responses |

---

## 4. Core Jobs To Be Done

1. **Connect WhatsApp:** Set up WhatsApp Business API securely with encrypted tokens
2. **Configure Bot:** Define bot identity, language behavior, and generation settings
3. **Add Knowledge:** Upload business knowledge (text, PDFs, websites) for RAG
4. **Automate Responses:** Bot answers customers within WhatsApp compliance rules
5. **Human Handoff:** Pause bot and take over conversations manually
6. **Track Operations:** Monitor delivery, failures, queue state, usage, and billing

---

## 5. Complete Feature Set

### 5.1 Bot Studio (Phase 3)
- **Tenant-scoped bot configuration:** Each organization has its own isolated bot
- **System prompt management:** Define company-wide bot behavior
- **Localized prompt templates:** Dedicated prompts for English (en) and Bahasa Indonesia (id)
- **Language auto-detection:** Supports auto, en, id
- **Model configuration:** Primary model selection (Gemini 2.5 Flash default), temperature, max tokens
- **Escalation settings:** Enable/disable handoff guidance, custom handoff messages
- **Emulator/preview:** Test bot responses before deployment
- **Prompt versioning:** Track prompt changes over time

### 5.2 Knowledge Base (Phase 4)
- **Multi-source ingestion:**
  - Inline text notes
  - Website crawling (Firecrawl or Jina Reader)
  - PDF support (deferred to later phase)
- **Markdown normalization:** All sources converted to markdown before embedding
- **Intelligent chunking:** Text split into semantically relevant chunks
- **Vector embeddings:** Using `gemini-embedding-001` for similarity search
- **Tenant-scoped retrieval:** RAG only retrieves from organization's own knowledge
- **Usage tracking:** See which knowledge sources powered which bot replies

### 5.3 WhatsApp Integration (Phase 5, 11)
- **Encrypted credential storage:** Access tokens and app secrets encrypted at rest
- **Webhook security:** Signature verification using raw body validation
- **Rate limiting:** Per phone number ID throttling at the edge
- **Connection lifecycle:** Full WABA lifecycle visibility including:
  - Meta app approval status
  - Phone verification status
  - Business profile sync
  - Display name review
  - Messaging tier
- **Blocker detection:** Automatic identification of setup blockers
- **OTP verification:** SMS/Voice phone verification flow
- **Template management:**
  - Sync approved templates from Meta
  - Local template CRUD operations
  - Template approval status tracking
  - Rejection reason visibility

### 5.4 Ingress & Inbound Processing (Phase 6, 7)
- **Edge verification:** Cloudflare Worker validates Meta GET/POST webhooks
- **Raw event durability:** Events stored before returning 200 to Meta
- **Inbound normalization:** Maps to contacts, conversations, messages, transport rows
- **Service window tracking:** Automatic 24-hour service window calculation
- **Debounced AI triggering:** Prevents bot spam, batches rapid user messages
- **Media handling:** Async media download, S3 storage, transcript enrichment
- **Duplicate detection:** Prevents processing the same event twice

### 5.5 Bot Orchestration (Phase 8)
- **Policy-aware queuing:** Claims eligible inbound conversations
- **Burst debouncing:** Waits for burst of messages to complete
- **Single reply rule:** One AI draft per inbound cluster
- **Guardrail protection:** Content and usage safeguards
- **State machine:** Idle → Pending → Generating → Queued/Blocked/Failed
- **Service window awareness:** Blocks replies outside 24-hour window
- **Opt-out compliance:** Respects contact opt-out preferences
- **Usage limit enforcement:** Blocks over-limit AI and outbound traffic
- **Dashboard notifications:** Alerts for service window expiry, bot failures

### 5.6 Outbound Queue (Phase 9)
- **Durable queue:** Convex-powered job queue with idempotency
- **Service window recheck:** Verifies eligibility right before send
- **Retry with backoff:** Configurable retry up to 5 attempts
- **Template fallback:** Uses approved templates when service window closed
- **Delivery reconciliation:** Syncs sent, delivered, read, failed status from Meta
- **Dashboard visibility:** Queue state visible in operator interface

### 5.7 Operator Inbox (Phase 10, 11)
- **Multi-panel workspace:** Conversations list + thread + notes + lifecycle
- **Assignment system:** Assign conversations to specific agents
- **Bot controls:** Pause/resume bot, handoff on/off
- **Internal notes:** Private context for agents
- **Manual replies:** Human can take over with structured composer
- **Message translation:** View translated thread without mutating original
- **Service window visibility:** Clear indicators of window status
- **Queue visibility:** See outbound queue state per conversation
- **Notifications:** Real-time dashboard notifications
- **Conversation lifecycle:** Open/close, reopen controls

### 5.8 Media Handling (Phase 11)
- **Async media download:** Downloads inbound media (audio, image, document)
- **S3-compatible storage:** Stores media with unique object keys
- **Transcription:** Audio messages transcribed for context
- **Image analysis:** Images can be summarized for conversation context
- **OCR:** Document text extraction
- **Metadata tracking:** File size, MIME type, SHA256 hashes
- **Download deadlines:** Rotated media handled gracefully

### 5.9 Billing & Analytics (Phase 12)
- **Geographic routing:**
  - **Indonesia:** Midtrans gateway, IDR currency
  - **Global:** Polar gateway, USD currency
- **Plan-based pricing:** Monthly plans with included quotas
- **Provider-agnostic subscriptions:** Convex stores abstract subscription state
- **Usage tracking:**
  - AI tokens (prompt + completion)
  - Inbound/outbound message counts
  - Queue failure counts
  - Delivery state metrics
  - Media processed count
- **Audit trail:** All billing events logged
- **Real-time counters:** Dashboard shows current period usage
- **Limit enforcement:** Backend blocks over-limit traffic

### 5.10 Dashboard & Marketing (Phase 13)
- **Localized landing page:** English and Bahasa Indonesia
- **SEO optimization:** Meta tags, OG images, structured data
- **Public docs:** Operational guides for WhatsApp setup, templates, policies
- **Pricing page:** Clear plans with geographic detection
- **Onboarding flow:** Guided multi-step setup
- **Multi-role dashboard:** Owner/Admin/Agent/Viewer access

---

## 6. Core Architecture

### 6.1 Monorepo Structure

```
wabrix/
├── apps/
│   ├── web/              # Next.js App Router (Vercel)
│   │   ├── [locale]/
│   │   │   ├── (marketing)/   # Public pages
│   │   │   ├── dashboard/     # Auth-required workspace
│   │   │   ├── onboarding/    # Guided setup
│   │   │   └── docs/          # Public documentation
│   │   └── api/               # Billing webhooks
│   └── ingress/          # Cloudflare Worker (Hono)
│       └── webhooks/         # Meta webhook receiver
└── packages/
    ├── backend/            # Convex backend
    │   ├── convex/
    │   │   ├── ai.ts            # AI generation
    │   │   ├── orchestrator.ts  # Bot orchestration
    │   │   ├── inbound.ts       # Inbound processing
    │   │   ├── outbound.ts      # Outbound actions
    │   │   ├── knowledge.ts     # Knowledge base
    │   │   ├── whatsapp.ts      # WhatsApp integration
    │   │   ├── billing.ts       # Billing logic
    │   │   ├── rbac.ts          # Role-based access
    │   │   └── schema.ts        # Database schema
    │   └── src/
    ├── config/             # Shared configuration
    ├── ui/                 # Shared UI components
    ├── eslint-config/      # Linting rules
    └── typescript-config/  # TypeScript configs
```

### 6.2 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 15, Tailwind, Radix UI | Web app, marketing, dashboard |
| **Auth** | Clerk | User auth, organizations, RBAC |
| **Backend** | Convex | Serverless functions, real-time DB, queue |
| **Ingress** | Cloudflare Workers, Hono | Edge webhook handling |
| **AI** | Google Gemini 2.5 Flash | Text generation |
| **Embeddings** | gemini-embedding-001 | Knowledge search |
| **Billing** | Polar (USD), Midtrans (IDR) | Payments |
| **Transport** | Meta WhatsApp Cloud API | Message delivery |
| **i18n** | next-intl | Localization (en, id) |

### 6.3 Runtime Flow

```
Inbound Flow:
WhatsApp User → Meta Webhook → Cloudflare Worker → Verify → Store in Convex
  → Normalize → Contact/Conversation/Message
  → Bot Orchestrator → AI Draft → Queue → Meta Send → Status Webhook

Outbound Flow:
Agent/Bot → Message Created → Queue Row → Send Check → Meta API
  → Status Webhook → Delivery Reconciliation
```

### 6.4 Architecture Principles

- **Reliability first:** Events stored before processing, idempotent operations
- **Tenant isolation:** All data scoped by organization, no cross-tenant leakage
- **Prompt-driven:** Bot behavior controlled by admins, not hardcoded routing
- **Policy-aware:** Service window enforced at every send point
- **Observable:** Audit logs, delivery tracking, queue visibility
- **Compliance-ready:** Opt-out, template enforcement, data handling

---

## 7. Data Model Overview

### 7.1 Core Entities

| Entity | Description |
|--------|-------------|
| **users** | Clerk-authenticated users |
| **organizations** | Tenant container |
| **orgMembers** | Organization membership with roles (owner/admin/agent/viewer) |
| **botProfiles** | AI bot configuration per org |
| **knowledgeSources** | Ingested knowledge (text, website, PDF) |
| **knowledgeChunks** | Vector embeddings for RAG |
| **whatsappIntegrations** | WhatsApp Business connection |
| **whatsappContacts** | End-customers on WhatsApp |
| **conversations** | Thread between org and contact |
| **messages** | Transcript messages (user/assistant/agent/system) |
| **whatsappMessages** | Transport-level messages with delivery state |
| **whatsappMedia** | Downloaded media with processing status |
| **outboundQueue** | Durable send queue with retry logic |
| **whatsappTemplates** | Approved message templates |
| **subscriptions/plans** | Billing tiers and active subscriptions |
| **usageCounters** | Aggregated usage by period |

### 7.2 Message Delivery States

```
received → queued → sent → delivered → read
                ↘ failed (retryPossible?)
```

### 7.3 Bot Orchestration States

```
idle → pending → generating → queued → sent
       ↓           ↓          ↓
     debounced   failed    blocked (paused/handoff/window-closed)
```

---

## 8. Compliance & Policy Enforcement

### 8.1 WhatsApp Service Window
- **24-hour rule:** Freeform replies only allowed within 24h of last inbound
- **Fallback to templates:** When window closed, must use pre-approved templates
- **Expiry tracking:** Conversations flagged 30 min before expiry
- **Real-time checks:** Verified right before send, not just at UI

### 8.2 Opt-Out Handling
- **Keyword detection:** "stop", "unsubscribe" triggers opt-out
- **Bot blocking:** Stops automatic replies to opted-out contacts
- **Audit trail:** Tracks opt-out reason and timestamp

### 8.3 Template Management
- **Meta approval required:** Templates must be approved
- **Status tracking:** draft → pending → approved/rejected
- **Rejection visibility:** Shows Meta rejection reasons
- **Local vs. remote:** Synced with Meta, archived locally

---

## 9. Billing Model

### 9.1 Plan Structure
Each plan includes:
- Seats (user count)
- AI token quota
- Outbound message quota
- Monthly price (IDR for Indonesia, USD for global)

### 9.2 Routing Logic
- **Country detection:** Uses Cloudflare/Vercel headers
- **Indonesia → Midtrans:** IDR pricing, local payment methods
- **Global → Polar:** USD pricing, international cards

### 9.3 Usage Tracking
Counters tracked per period:
- AI runs, tokens, estimated cost
- Inbound/outbound message counts
- Template vs. freeform usage
- Delivery states (sent, delivered, read, failed)
- Queue failures
- Media processed

---

## 10. Localization

### 10.1 Supported Locales
- **en:** English (primary)
- **id:** Bahasa Indonesia

### 10.2 Localized Content
- Marketing pages
- Dashboard UI
- Public documentation
- Email/notification content
- Bot responses (language-aware)

### 10.3 Indonesian Market Focus
- Bahasa Indonesia support throughout
- Local payment (Midtrans/IDR)
- RTL-friendly UI architecture
- Localized documentation

---

## 11. Development & Production

### 11.1 Current Phase
**Phase 13:** Public landing, SEO, docs, and growth surfaces

### 11.2 Completed Phases
- ✅ Phase 0: PRD, architecture, data model
- ✅ Phase 1: Monorepo foundation
- ✅ Phase 2: Auth, tenancy, RBAC
- ✅ Phase 3: Bot Studio
- ✅ Phase 4: Knowledge Base
- ✅ Phase 5: WhatsApp setup
- ✅ Phase 6: Production ingress
- ✅ Phase 7: Inbound normalization
- ✅ Phase 8: Bot orchestration
- ✅ Phase 9: Outbound queue
- ✅ Phase 10: Operator inbox
- ✅ Phase 11: Templates, media, WABA lifecycle
- ✅ Phase 12: Analytics, billing, usage limits
- ✅ Phase 13: Landing, SEO, docs

### 11.3 Build Commands
```bash
pnpm install
pnpm dev              # Start all services
pnpm lint            # ESLint
pnpm typecheck       # TypeScript
pnpm test            # Test suite
pnpm build           # Production build
```

---

## 12. Key Differentiators

### 12.1 Technical Differentiation
- **Real production architecture:** Not a demo app—has ingress workers, durable queue, real-time DB
- **Policy enforcement at backend:** Service window checked at send time, not just UI
- **Tenant-isolated RAG:** Knowledge retrieval scoped strictly per organization
- **Geographic billing:** First-class Indonesia market support with local payments
- **Full audit trail:** Every sensitive action logged

### 12.2 Operational Differentiation
- **Compliant by default:** Service windows, opt-out, template rules enforced
- **Human + bot harmony:** Designed for handoff, not just automation
- **Multi-role dashboard:** Tailored experiences per user role
- **Visibility-first:** Real-time queue state, delivery tracking, notifications

### 12.3 Market Positioning
- **Revenue-grade:** Built for businesses that actually need reliable WhatsApp ops
- **Production-focused:** Prioritizes reliability over feature count
- **WhatsApp-native:** Not a generic chatbot with WhatsApp bolted on

---

## 13. Messaging Guidelines

### 13.1 Do
- Speak to operational efficiency and reliability
- Emphasize compliance awareness (service windows, opt-out)
- Highlight Indonesia market support
- Focus on the "workspace" / "ops" angle
- Mention real infrastructure (Convex, Cloudflare Workers)
- Use terms like "production-ready," "reliability-first," "tenant-scoped"

### 13.2 Don't
- Don't position as "AI-first" — it's "WhatsApp-first with AI"
- Don't sell as "no-code" — it's professional tooling for teams
- Don't emphasize template-free UX (templates are real and required)
- Don't claim universal pricing — the geo-aware routing is a feature
- Don't overpromise features not in the code (PDF deferred, CI/CD deferred)

---

## 14. FAQ (Common Questions)

**Q: Is this ready for production traffic?**
A: Yes. Staging already validates Meta signatures, stores webhook events durably, normalizes messages, drafts AI replies, and reconciles delivery status.

**Q: How does billing work for different regions?**
A: Indonesia routes to Midtrans with IDR. Other countries default to Polar with USD. The pricing page reflects that logic.

**Q: Can operators take over from the bot?**
A: Yes. Inbox supports assignment, internal notes, manual reply, bot pause, and handoff controls.

**Q: What about the 24-hour service window?**
A: Policy is enforced at the backend before every send. Templates are required outside the window.

**Q: Is data isolated between tenants?**
A: Yes. All data is scoped by organization at the database layer. Knowledge retrieval only sees that org's documents.

---

## 15. Integration Requirements

### 15.1 Required Third Parties
- **Clerk:** Authentication and organizations
- **Convex:** Backend functions and database
- **Meta:** WhatsApp Cloud API
- **Polar:** Global billing (USD)
- **Midtrans:** Indonesia billing (IDR)
- **Cloudflare:** Ingress worker hosting
- **Vercel:** Web app hosting
- **Google AI:** Gemini models and embeddings

### 15.2 Environment Variables
Key configuration:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CONVEX_URL`
- `META_ACCESS_TOKEN`, `META_APP_SECRET`, `META_VERIFY_TOKEN`
- `POLAR_ACCESS_TOKEN`
- `MIDTRANS_SERVER_KEY`
- `GEMINI_API_KEY`
- `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`

---

## 16. Success Metrics

The product succeeds when:

1. **Business can connect WhatsApp** and configure a bot without touching code
2. **Inbound message → stored transcript → AI draft → queued send → reconciled delivery** flows end-to-end
3. **Bot behavior follows** admin prompt and knowledge, not rigid backend routing
4. **Freeform outbound is blocked** outside the WhatsApp service window
5. **Admins can see setup blockers,** queue failures, and delivery outcomes
6. **Operators can pause bot** and take over conversations smoothly
7. **Billing is accurate** and geography-aware

---

*Document Version: Phase 13 Release*
*Last Updated: 2026-04-25*
*Generated for landing page and marketing context*
