# Phase 12: Analytics, Billing, And Limits

Phase 12 is implemented.

## Implemented

- Added provider-agnostic billing and usage data in [packages/backend/convex/schema.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/schema.ts):
  - `plans`
  - `subscriptions`
  - `usageCounters`
  - `billingEvents`
- Added shared billing logic in:
  - [packages/backend/convex/lib/billing.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/lib/billing.ts)
  - [packages/backend/convex/billing.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/billing.ts)
- Added a unified internal billing webhook ingest path in [packages/backend/convex/http.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/http.ts).
- Wired usage counters into real runtime flows:
  - AI token and run logging in [packages/backend/convex/configuration.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/configuration.ts)
  - inbound usage in [packages/backend/convex/inbound.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/inbound.ts)
  - outbound enforcement and usage in [packages/backend/convex/inbox.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/inbox.ts), [packages/backend/convex/orchestrator.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/orchestrator.ts), [packages/backend/convex/outbound.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/outbound.ts), and [packages/backend/convex/media.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/media.ts)
  - AI limit checks in [packages/backend/convex/ai.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/ai.ts) and [packages/backend/convex/orchestratorAction.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/orchestratorAction.ts)
- Added server-side billing provider helpers plus checkout and webhook handlers in:
  - [apps/web/lib/billing.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/lib/billing.ts)
  - [apps/web/app/api/billing/checkout/route.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/api/billing/checkout/route.ts)
  - [apps/web/app/api/billing/webhooks/[gateway]/route.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/api/billing/webhooks/%5Bgateway%5D/route.ts)
- Added phase-12 UI surfaces:
  - public pricing page in [apps/web/app/[locale]/pricing/page.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/pricing/page.tsx)
  - billing workspace in [apps/web/app/[locale]/dashboard/billing/page.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/dashboard/billing/page.tsx)
  - analytics workspace in [apps/web/app/[locale]/dashboard/analytics/page.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/dashboard/analytics/page.tsx)
- Added verification coverage in:
  - [packages/backend/__tests__/billing-utils.test.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/__tests__/billing-utils.test.ts)
  - [apps/web/__tests__/pricing.test.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/__tests__/pricing.test.tsx)
  - [apps/web/__tests__/billing.test.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/__tests__/billing.test.tsx)

## Behavior

- Usage is now counted from real product activity instead of fake dashboard math:
  - AI runs increment token counters
  - inbound and outbound message flows increment message counters
  - queue failures, delivery outcomes, and processed media increment operational counters
- Backend limit checks now run inside the actual runtime paths, so direct backend calls cannot bypass the current outbound-message or AI-token guard.
- Billing remains provider-agnostic in Convex even though checkout and webhook parsing are provider-specific at the edge.
- Pricing and billing route Indonesian traffic to Midtrans with IDR, while non-Indonesian traffic defaults to Polar with USD.
- Next.js now owns the public billing webhook surface, verifies the incoming provider signature, normalizes payloads, and forwards the normalized event into Convex for idempotent processing.
- Billing events store gateway, normalized status, external ids, currency, amount, and the raw payload for audit or debugging.
- Analytics dashboard now exposes current usage, queue state, delivery state, and recent AI runs from real tenant data.

## Automated Verification

- `npx convex codegen` from [packages/backend](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend)
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- Existing non-blocking warning:
  - Next 16 still warns that `middleware.ts` is deprecated in favor of `proxy.ts`

## Manual DoD Check

1. Deploy the updated Convex schema and functions to staging, then run `npx convex codegen` from `packages/backend`.
2. Set the phase-12 billing envs on the web app:
   `CONVEX_HTTP_URL`, `CONVEX_SHARED_SECRET`, `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_STARTER_PRODUCT_ID`, `POLAR_GROWTH_PRODUCT_ID`, `POLAR_SCALE_PRODUCT_ID`, `MIDTRANS_SERVER_KEY`, and `MIDTRANS_IS_PRODUCTION`.
3. Open `/en/pricing`, switch the country selector to `ID`, and confirm the page shows `midtrans` with `IDR`.
4. Switch the pricing selector to `US` or another non-Indonesia country and confirm the page shows `polar` with `USD`.
5. Open `/en/dashboard/billing` as an org admin and confirm subscription state, usage bars, and recent billing events render.
6. Start a Polar checkout path from a non-Indonesia country and confirm the returned checkout uses USD.
7. Start a Midtrans checkout path from Indonesia and confirm the returned checkout uses IDR sandbox flow.
8. Send one valid Polar webhook payload in sandbox, then resend the same payload, and confirm `billingEvents` stays idempotent.
9. Send one valid Midtrans webhook payload in sandbox, then resend the same payload, and confirm `billingEvents` stays idempotent.
10. Confirm the webhook processing updates a provider-agnostic row in `subscriptions` instead of leaking provider-specific state into the rest of the app.
11. Trigger real AI and messaging activity in staging and confirm `usageCounters` increments for tokens and messages.
12. Push usage over the active plan limit and confirm the backend blocks the affected direct flow instead of only disabling the UI.
13. Open `/en/dashboard/analytics` and confirm usage, queue metrics, delivery metrics, and recent AI runs are visible.

## Notes

- Phase 12 intentionally focuses on subscription state, usage enforcement, and operational visibility. Marketing-grade pricing storytelling still belongs to phase 13.
- Full provider sandbox browser E2E remains environment-heavy, so the repo currently covers the billing surface with component tests plus manual sandbox DoD validation.
