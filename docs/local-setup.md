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
  - `NEXT_PUBLIC_INGRESS_URL`
  - `CONVEX_SHARED_SECRET`
  - `CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `CLERK_WEBHOOK_SECRET`
  - `CLERK_ISSUER_URL`
  - `ENCRYPTION_SECRET`
- Phase 3 uses `GOOGLE_GENERATIVE_AI_API_KEY` as the default AI runtime fallback when an org-specific encrypted key has not been saved yet.
- Phase 4 uses that same Google key for knowledge embeddings through `gemini-embedding-001`.
- Phase 5 uses `NEXT_PUBLIC_INGRESS_URL` to display the exact webhook URL that must be configured in Meta while keeping raw credentials off the frontend.
- Phase 6 uses `META_APP_SECRET`, `META_VERIFY_TOKEN`, and `CONVEX_SHARED_SECRET` in the worker for signature verification, GET challenge validation, and trusted raw-event writes back to Convex.
- Phase 6 also expects the `WHATSAPP_WEBHOOK_RATE_LIMITER` binding configured in [apps/ingress/wrangler.toml](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/ingress/wrangler.toml). Replace the placeholder `namespace_id` before staging or production rollout.
- Website ingestion uses Jina Reader first by default.
- `FIRECRAWL_API_KEY` is optional and enables a hosted secondary ingestion path before the local HTML fallback.
- Observability env vars for Helicone or Axiom are optional in local development.
