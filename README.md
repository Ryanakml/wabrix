# Wabrix

Wabrix is a production-oriented WhatsApp AI SaaS designed to streamline customer communication with intelligent automated bots, comprehensive analytics, and a seamless operator workspace.

---

## 👥 For Users: What is Wabrix?

Wabrix helps businesses scale their WhatsApp operations by integrating powerful AI with an intuitive human-in-the-loop dashboard. 

### Key Features
- **AI Bot Studio**: Configure bots with specific instructions, languages, and custom AI models. Test interactions directly in the dashboard before going live.
- **Knowledge Base Integration**: Upload documents or provide website URLs. Wabrix parses them automatically so your AI bot can answer questions accurately based on your proprietary business data.
- **Unified Inbox & Agent Handoff**: A multi-panel operator workspace where human agents can monitor conversations and take over seamlessly when the bot needs help. Includes real-time translation toggles, internal notes, and assignment tools.
- **Analytics & Billing**: Comprehensive dashboards to track AI token usage, messaging volume, and user subscriptions transparently.
- **WhatsApp Native**: Full support for WhatsApp message templates, rich media handling (images, voice notes), contact opt-in/opt-out flows, and strict compliance with the Meta 24-hour service window.

---

## 💻 For Developers: Technical Overview

Wabrix is built as a `pnpm` monorepo using Turborepo, optimizing for scalability, robust type safety, and a distinct separation of concerns.

### Architecture & Tech Stack
- **`apps/web`**: Next.js App Router shell with Tailwind CSS and `next-intl` for localized routing (English & Bahasa Indonesia).
- **`apps/ingress`**: Hono Cloudflare Worker shell optimized for fast, edge-based webhook ingestion directly from Meta.
- **`packages/backend`**: Convex backend powering real-time data, synchronization, authentication (via Clerk), RBAC, and the core Bot Studio runtime.
- **`packages/config`**: Shared product and locale configurations.
- **`packages/ui`**: Shared UI primitives based on modern React design patterns.

### Quick Setup

```bash
pnpm install
pnpm dev
```

**Core Commands:**
- `pnpm lint` — Run linters across the workspace
- `pnpm typecheck` — Run TypeScript compiler checks
- `pnpm test` — Execute test suites
- `pnpm build` — Build all applications and packages

### Documentation & Guides
- [Environment And Deployment Guide](./environment-and-deployment-guide.md)
- [Local Setup Guide](./docs/local-setup.md)
- [Contributing](./CONTRIBUTING.md)

*Detailed phase-by-phase project summaries are available in the `./docs/` directory.*

### Current Implementation State

Wabrix is built via a phased development approach. The current production state includes:

**Core Infrastructure & Auth**
- Clerk auth, organization sync, RBAC, and audit logging are in place.
- Pricing routes Indonesia to Midtrans (IDR) and non-Indonesia countries to Polar (USD).
- Web and ingress health/build surfaces are in place.

**Bot & AI Engine**
- Bot Studio exists in the dashboard with tenant-scoped prompt, language, provider, and emulator configuration.
- Knowledge Base handles inline and website ingestion, markdown normalization, embeddings, and scoped retrieval.
- Gemini 2.5 Flash is wired as the default draft-generation model, and `gemini-embedding-001` is wired for knowledge embeddings.
- Usage counters track AI tokens, messaging, queue failures, delivery state, and processed media (with hard backend limits).

**WhatsApp Ingress & Routing**
- Secure tenant-scoped WhatsApp setup with encrypted token storage, hashed verify token storage, and audit-ready connection state.
- Ingress verifies Meta GET and POST requests, rate limits per phone number, and durably stores raw webhook events before returning `200`.
- Inbound events normalize into contacts, conversations, transcript rows, transport rows, and media-debug records.
- Inbound WhatsApp media downloads asynchronously and is stored in S3-compatible object storage.

**Orchestration & Outbound queues**
- Bot orchestration claims eligible inbound conversations, debounces bursts, drafts AI replies, and manages durable outbound queue rows.
- Outbound queue workers send WhatsApp text replies to Meta with idempotency, retry backoff, and strict service-window rechecks.
- Status webhooks reconcile transcript/transport delivery states and update visibility for sent, delivered, read, and failed outcomes.
- Contact opt-out/opt-in keywords affect bot orchestration to maintain compliance.

**Operator & Admin Tools**
- The inbox provides a multi-panel operator workspace with assignment, handoff, bot pause, internal notes, lifecycle visibility, and manual replies.
- WhatsApp admin ops include lifecycle refresh, template sync/CRUD, rejection visibility, and OTP verification directly from the dashboard.
- Approved WhatsApp templates can be queued from the inbox when the standard 24-hour service window is closed.
- Dashboard notifications alert operators of service-window warnings, bot-reply failures, and outbound send failures.

### Future Roadmap
- Landing page, SEO, public documentation, and growth surfaces.
- CI/CD pipelines, advanced monitoring, and production hardening.