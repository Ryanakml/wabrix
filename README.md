# wabrix

`wabrix` is a production-oriented WhatsApp AI SaaS built as a `pnpm` monorepo with Turborepo.

Phase 0 is approved. Phase 1 established the monorepo foundation, phase 2 established auth and tenancy, and phase 3 now ships the first configurable bot runtime.

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
- [Local Setup](./docs/local-setup.md)
- [Contributing](./CONTRIBUTING.md)

## Current State

Current implemented state:

- Clerk auth, organization sync, RBAC, and audit logging are in place.
- Locale routing is live for English and Bahasa Indonesia.
- Bot Studio exists in the dashboard with tenant-scoped prompt, language, provider, and emulator configuration.
- Gemini 2.5 Flash is wired as the default draft-generation model path.
- Web and ingress health/build surfaces are in place.

Still intentionally deferred to later phases:

- Knowledge base and RAG
- WhatsApp inbound normalization and outbound queue orchestration
- Inbox and handoff workflows
- Templates, analytics, and billing
