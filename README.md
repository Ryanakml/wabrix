# wabrix

`wabrix` is a production-oriented WhatsApp AI SaaS built as a `pnpm` monorepo with Turborepo.

Phase 0 is approved, and phase 1 now provides the repo foundation:

- `apps/web`: Next.js App Router shell with Tailwind and `next-intl`
- `apps/ingress`: Hono Cloudflare Worker shell with Wrangler placeholders
- `packages/backend`: Convex package scaffold
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
- [Local Setup](./docs/local-setup.md)
- [Contributing](./CONTRIBUTING.md)

## Current State

Phase 1 intentionally stops at shell-level implementation:

- Marketing and dashboard pages exist with placeholder auth state.
- Locale routing is initialized for English and Bahasa Indonesia.
- Health endpoints exist for web and ingress.
- Real Clerk, Convex, WhatsApp, billing, and queue behavior begin in later phases.
