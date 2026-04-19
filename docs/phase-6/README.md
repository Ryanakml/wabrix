# Phase 6: Webhook Ingress

Phase 6 is implemented.

## Implemented

- Added raw-event durability and webhook tracking to [packages/backend/convex/schema.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/schema.ts):
  - `whatsappWebhookEvents`
  - additional webhook indexes and tracking fields on `whatsappIntegrations`
- Added internal webhook persistence and verification mutations in [packages/backend/convex/whatsappWebhookEvents.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/whatsappWebhookEvents.ts).
- Added trusted worker-to-Convex HTTP routes in [packages/backend/convex/http.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/http.ts):
  - `POST /internal/whatsapp/webhook-events`
  - `POST /internal/whatsapp/webhook-verified`
- Replaced the ingress placeholder with a real Hono webhook app in:
  - [apps/ingress/src/index.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/ingress/src/index.ts)
  - [apps/ingress/src/whatsapp.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/ingress/src/whatsapp.ts)
- Added Cloudflare rate-limit binding config in [apps/ingress/wrangler.toml](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/ingress/wrangler.toml).
- Added worker and backend tests in:
  - [apps/ingress/src/index.test.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/ingress/src/index.test.ts)
  - [packages/backend/__tests__/whatsapp-webhook-events.test.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/__tests__/whatsapp-webhook-events.test.ts)

## Behavior

- `GET /webhooks/whatsapp` only accepts `hub.mode=subscribe`, validates the configured verify token, returns the challenge body, and best-effort marks the matching integration as `verified`.
- `POST /webhooks/whatsapp` rejects requests whose body was consumed before signature verification.
- Signature validation uses the exact raw request body and `X-Hub-Signature-256`.
- Rate limiting is scoped by extracted `phoneNumberId`.
- The worker writes to Convex and only returns `200` after Convex accepts the raw event.
- Duplicate events increment `attemptCount` without duplicating downstream media work.
- Media webhook events are flagged as high-priority download work with a deadline instead of calling AI inline.
- The worker does not call AI and does not touch outbound queue state.

## Automated Verification

- `npx convex codegen`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- Worker tests:
  - valid GET challenge
  - invalid verify token
  - valid signed POST
  - invalid signature
  - raw-body preservation
  - consumed-body guard
  - rate-limit key uses `phoneNumberId`
  - burst on one phone number does not block another
  - media events enqueue high-priority work
- Backend tests:
  - raw event is saved and linked to the matching integration
  - duplicate events do not duplicate downstream work

## Manual DoD Check

1. Set `.env.local` and worker vars for `META_APP_SECRET`, `META_VERIFY_TOKEN`, `CONVEX_HTTP_URL`, and `CONVEX_SHARED_SECRET`.
2. Replace the placeholder rate-limit `namespace_id` in [apps/ingress/wrangler.toml](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/ingress/wrangler.toml) before any staged deployment.
3. Run `pnpm dev`.
4. Verify the GET challenge locally:
   `curl -i "http://localhost:8787/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=test_verify_token&hub.challenge=challenge_123"`
5. Confirm a valid request returns `200` with `challenge_123` as the body.
6. Repeat with an invalid verify token and confirm the worker rejects it.
7. Send a valid signed POST fixture and confirm the worker returns `200`.
8. Send the same payload with an invalid `X-Hub-Signature-256` and confirm the worker rejects it.
9. Inspect Convex data and confirm exactly one row is stored in `whatsappWebhookEvents` for the first accepted payload.
10. Resend the same signed payload and confirm the existing row increments `attemptCount` rather than creating a second event row.
11. Send a media webhook fixture and confirm the stored row shows `processingStatus = media_download_queued`, `mediaDownloadStatus = queued`, and `mediaDownloadPriority = high`.
12. Confirm no AI run or outbound queue state changes happen as part of the ingress request path.

## Notes

- The `WHATSAPP_WEBHOOK_RATE_LIMITER` binding is configured with a placeholder namespace for repo bootstrap only. Real Cloudflare accounts must replace it before staging or production rollout.
- Verification tracking is best-effort so a transient Convex tracking failure does not block Meta challenge completion.
- Phase 6 stops at safe verification, rate limiting, and raw-event durability. Inbound normalization and conversation mapping begin in phase 7.
