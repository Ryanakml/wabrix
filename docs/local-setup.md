# Local Setup

## Workspace

This repo uses a `pnpm` workspace with Turborepo.

## Commands

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Apps

- `apps/web`: Next.js marketing and dashboard shell
- `apps/ingress`: Hono Cloudflare Worker shell

## Ports

- Web: `http://localhost:3000`
- Ingress: `http://localhost:8787`

## Notes

- Phase 1 intentionally uses placeholder auth and placeholder ingress logic.
- Real Convex, Clerk, WhatsApp, and billing integrations start in later phases.
