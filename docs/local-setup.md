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

- Copy [.env.example](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/.env.example) to `.env.local` before starting local development.
- Current local development expects at minimum:
  - `NEXT_PUBLIC_CONVEX_URL`
  - `CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `CLERK_WEBHOOK_SECRET`
  - `CLERK_ISSUER_URL`
  - `ENCRYPTION_SECRET`
- Phase 3 uses `GOOGLE_GENERATIVE_AI_API_KEY` as the default AI runtime fallback when an org-specific encrypted key has not been saved yet.
- Observability env vars for Helicone or Axiom are optional in local development.
