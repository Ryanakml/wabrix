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
  - `CONVEX_HTTP_URL`
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
- Phase 7 adds a read-only inbox surface and requires phase-6 raw event durability to already be healthy.
- Phase 8 adds bot orchestration plus the first durable outbound queue. It reuses the existing `GOOGLE_GENERATIVE_AI_API_KEY` fallback or the org-level encrypted key already saved through Bot Studio; no new external credential is introduced in this phase.
- Phase 9 reuses the existing WhatsApp integration credentials from phase 5 for real outbound sends and delivery-status reconciliation. `WHATSAPP_GRAPH_API_BASE_URL` is optional and only useful if you want to point the sender at a mock or alternative Graph base during testing.
- Phase 10 adds the operator inbox workspace, manual human replies through the same outbound queue, internal notes, assignee controls, and on-demand thread translation. Translation reuses the same Bot Studio provider key or Google fallback that already exists in earlier phases.
- Phase 11 adds production WhatsApp template sync plus lifecycle refresh actions on the dashboard. It reuses the existing Meta credentials from phase 5 and needs a real `phoneNumberId` plus `businessAccountId` before staging validation makes sense.
- Phase 11 media processing can optionally upload inbound media to S3-compatible storage. Set `MEDIA_STORAGE_ENDPOINT`, `MEDIA_STORAGE_BUCKET`, `MEDIA_STORAGE_ACCESS_KEY_ID`, `MEDIA_STORAGE_SECRET_ACCESS_KEY`, and `MEDIA_STORAGE_REGION` if you want durable object storage instead of metadata-only processing.
- Phase 11 media summarization or transcription can optionally use `WHATSAPP_MEDIA_GEMINI_MODEL`. If unset, the current Google model path is still reused when available.
- Phase 12 adds billing and analytics. The web app now needs `CONVEX_HTTP_URL` plus `CONVEX_SHARED_SECRET` in the same environment so the unified Next.js billing webhook handler can forward normalized events into Convex.
- Phase 12 Polar checkout expects `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, and one product id env per plan: `POLAR_STARTER_PRODUCT_ID`, `POLAR_GROWTH_PRODUCT_ID`, and `POLAR_SCALE_PRODUCT_ID`.
- Phase 12 Midtrans checkout expects `MIDTRANS_SERVER_KEY`. `MIDTRANS_IS_PRODUCTION=true` switches the checkout route from sandbox to production. `MIDTRANS_CLIENT_KEY` stays optional unless you later add direct browser-side Midtrans widgets.
- Phase 12 Geo-IP routing uses `cf-ipcountry`, `x-vercel-ip-country`, or the manual country selector on the pricing and billing pages. In local development, the selector is the easiest way to test both Polar and Midtrans paths.
- Website ingestion uses Jina Reader first by default.
- `FIRECRAWL_API_KEY` is optional and enables a hosted secondary ingestion path before the local HTML fallback.
- Observability env vars for Helicone or Axiom are optional in local development.
