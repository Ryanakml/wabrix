# wabrix

`wabrix` is a production-oriented WhatsApp AI SaaS built as a `pnpm` monorepo with Turborepo.

Phase 0 is approved. Phase 1 established the monorepo foundation, phase 2 established auth and tenancy, phase 3 shipped the configurable bot runtime, phase 4 added the Knowledge Base and retrieval layer, phase 5 added tenant-scoped WhatsApp integration setup, phase 6 added production-safe webhook ingress, phase 7 added inbound normalization plus conversation mapping, phase 8 added bot orchestration plus the first durable outbound queue, phase 9 added outbound sending plus delivery-status reconciliation, and phase 10 now adds the operator inbox, handoff controls, and manual agent tools.

- `apps/web`: Next.js App Router shell with Tailwind and `next-intl`
- `apps/ingress`: Hono Cloudflare Worker shell with Wrangler placeholders
- `packages/backend`: Convex backend with auth sync, RBAC, and Bot Studio runtime
- `packages/config`: shared product and locale config
- `packages/ui`: shared UI primitives

## Setup

```bash
pnpm install
pnpm dev
```

Core commands:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## Documentation

- [Phase 0 Index](./docs/phase-0/README.md)
- [Phase 2 Summary](./docs/phase-2/README.md)
- [Phase 3 Summary](./docs/phase-3/README.md)
- [Phase 4 Summary](./docs/phase-4/README.md)
- [Phase 5 Summary](./docs/phase-5/README.md)
- [Phase 6 Summary](./docs/phase-6/README.md)
- [Phase 7 Summary](./docs/phase-7/README.md)
- [Phase 8 Summary](./docs/phase-8/README.md)
- [Phase 9 Summary](./docs/phase-9/README.md)
- [Phase 10 Summary](./docs/phase-10/README.md)
- [Environment And Deployment Guide](./environment-and-deployment-guide.md)
- [Local Setup](./docs/local-setup.md)
- [Contributing](./CONTRIBUTING.md)

## Current State

Current implemented state:

- Clerk auth, organization sync, RBAC, and audit logging are in place.
- Locale routing is live for English and Bahasa Indonesia.
- Bot Studio exists in the dashboard with tenant-scoped prompt, language, provider, and emulator configuration.
- Knowledge Base exists with inline and website ingestion, markdown normalization, embeddings, and scoped retrieval.
- WhatsApp setup exists with encrypted token storage, hashed verify token storage, webhook URL visibility, and audit-ready connection state.
- Ingress now verifies Meta GET and POST requests, rate limits per phone number, and durably stores raw webhook events before returning `200`.
- Inbound WhatsApp events now normalize into contacts, conversations, transcript rows, transport rows, and media-debug records.
- Bot orchestration now claims eligible inbound conversations, debounces bursts, drafts one AI reply, and creates one durable outbound queue row.
- Outbound queue workers now send WhatsApp text replies to Meta with idempotency, retry backoff, and service-window rechecks right before send.
- Status webhook events now reconcile transcript delivery state, transport delivery state, and queue visibility for sent, delivered, read, and failed outcomes.
- The inbox is now a multi-panel operator workspace with assignment, handoff, bot pause, internal notes, lifecycle visibility, manual replies, and translation toggle support.
- Service-window warnings and bot-reply failures now surface as dashboard notifications.
- Outbound send failures now surface as dashboard notifications with retry visibility.
- Gemini 2.5 Flash is wired as the default draft-generation model path.
- `gemini-embedding-001` is wired for knowledge embeddings.
- Web and ingress health/build surfaces are in place.

Still intentionally deferred to later phases:

- Production WhatsApp template dispatch and richer media send flows
- Analytics and billing
