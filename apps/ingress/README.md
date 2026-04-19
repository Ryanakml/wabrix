# Ingress Worker

Phase 6 is now live in the worker.

## Commands

```bash
pnpm --filter @wabrix/ingress dev
pnpm --filter @wabrix/ingress test
pnpm --filter @wabrix/ingress build
```

## Current Scope

- `GET /webhooks/whatsapp` validates the Meta challenge token.
- `POST /webhooks/whatsapp` validates `X-Hub-Signature-256` using the exact raw request body.
- Requests are rate-limited by `phoneNumberId`.
- Accepted events are durably written to Convex before the worker returns `200`.
- Media webhook events are marked for high-priority download work without calling AI inline.

## Config

- Set `META_APP_SECRET`, `META_VERIFY_TOKEN`, `CONVEX_HTTP_URL`, and `CONVEX_SHARED_SECRET`.
- Replace the placeholder `WHATSAPP_WEBHOOK_RATE_LIMITER` `namespace_id` in [wrangler.toml](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/ingress/wrangler.toml) before staging or production deployment.
- Run `pnpm --filter @wabrix/ingress cf-typegen` if you want generated binding typings from Wrangler.
