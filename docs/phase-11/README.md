# Phase 11: Templates, Media, And WhatsApp Production Rules

Phase 11 is implemented.

## Implemented

- Expanded the WhatsApp production schema in [packages/backend/convex/schema.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/schema.ts) with:
  - `whatsappTemplates`
  - `whatsappTemplateSyncLogs`
  - `wabaLifecycleEvents`
  - richer `whatsappIntegrations`, `whatsappMedia`, `whatsappMessages`, `messages`, `outboundQueue`, `whatsappContacts`, and `dashboardNotifications` fields
- Added tenant-scoped WhatsApp admin logic in:
  - [packages/backend/convex/whatsapp.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/whatsapp.ts)
  - [packages/backend/convex/whatsappAction.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/whatsappAction.ts)
- Added asynchronous media processing runtime in:
  - [packages/backend/convex/media.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/media.ts)
  - [packages/backend/convex/mediaAction.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/mediaAction.ts)
- Updated inbound, inbox, orchestration, outbound, and webhook event flows in:
  - [packages/backend/convex/inbound.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/inbound.ts)
  - [packages/backend/convex/inbox.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/inbox.ts)
  - [packages/backend/convex/orchestrator.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/orchestrator.ts)
  - [packages/backend/convex/outbound.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/outbound.ts)
  - [packages/backend/convex/outboundAction.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/outboundAction.ts)
  - [packages/backend/convex/whatsappWebhookEvents.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/whatsappWebhookEvents.ts)
- Updated the ingress event parser in [apps/ingress/src/whatsapp.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/ingress/src/whatsapp.ts) so template webhook events get stable provider event keys.
- Expanded the dashboard UI in:
  - [apps/web/app/[locale]/dashboard/whatsapp/page.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/dashboard/whatsapp/page.tsx)
  - [apps/web/app/[locale]/dashboard/whatsapp/whatsapp-settings-client.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/dashboard/whatsapp/whatsapp-settings-client.tsx)
  - [apps/web/app/[locale]/dashboard/inbox/page.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/dashboard/inbox/page.tsx)
  - [apps/web/app/[locale]/dashboard/inbox/inbox-client.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/dashboard/inbox/inbox-client.tsx)
- Updated verification coverage in:
  - [apps/web/__tests__/inbox.test.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/__tests__/inbox.test.tsx)
  - [apps/web/__tests__/whatsapp-settings.test.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/__tests__/whatsapp-settings.test.tsx)
  - [packages/backend/__tests__/whatsapp.test.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/__tests__/whatsapp.test.ts)

## Behavior

- WhatsApp setup now exposes lifecycle blockers, approval state, phone verification state, business profile sync state, messaging tier, and template sync history without exposing secrets to the frontend.
- Operators can refresh lifecycle state, sync templates from Meta, request an OTP, verify that OTP, and maintain local template records from the dashboard.
- Freeform text replies remain blocked outside the 24-hour customer service window, but approved WhatsApp templates can now be queued from the inbox when the window is closed.
- Outbound queue jobs now distinguish `text` versus `template` payloads so Meta dispatch uses the correct transport payload and compliance rules.
- Template rejection reasons and WABA action blockers surface as dashboard notifications for faster operator follow-up.
- Inbound voice notes, images, and documents now create durable media work rows, then process asynchronously for metadata fetch, optional object storage upload, and optional transcript or summary enrichment.
- When media processing completes, the related transcript row is patched so later AI drafts and operators can use the extracted context.
- Contact opt-out and opt-in keywords now update contact compliance state, and opted-out contacts block automatic bot replies until the customer opts back in.
- Template status and lifecycle webhook events now feed durable async processors instead of being treated as generic raw webhook storage only.

## Automated Verification

- `npx convex codegen` from [packages/backend](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend)
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Existing non-blocking warning:
  - Next 16 still warns that `middleware.ts` is deprecated in favor of `proxy.ts`

## Manual DoD Check

1. Deploy the updated Convex schema and functions to staging, then run `npx convex codegen` from `packages/backend`.
2. Confirm the org already has a real WhatsApp integration with valid `phoneNumberId`, `businessAccountId`, `accessToken`, and `appSecret`.
3. Open `/en/dashboard/whatsapp`, run template sync, and confirm `whatsappTemplates` rows are created or updated for the active tenant.
4. Confirm template approval state, category, language, and any rejection reason are visible on the WhatsApp setup page.
5. Run lifecycle refresh and confirm the integration lifecycle fields update, `wabaLifecycleEvents` grows, and any blockers appear in the UI.
6. Request an OTP, verify the OTP, and confirm `phoneVerificationStatus` transitions correctly.
7. Close the service window for a conversation, try a freeform manual reply, and confirm backend compliance still blocks the freeform send.
8. With that same closed-window conversation, send an approved template reply from the inbox and confirm `messages`, `whatsappMessages`, and `outboundQueue` rows are created with `payloadType = template`.
9. Try to queue an unapproved or archived template and confirm the backend rejects it.
10. Send an inbound voice note and confirm a `whatsappMedia` row is created, processed asynchronously, and patches transcript context with transcript or summary data.
11. Send an inbound image or document and confirm storage metadata, extracted text or summary fields, and transcript enrichment all update correctly.
12. Send an opt-out keyword such as `STOP`, then send a fresh inbound message and confirm bot orchestration does not auto-reply while the contact remains opted out.
13. Send an opt-in keyword such as `START` and confirm automated bot behavior can resume on later eligible inbound messages.
14. Replay template-status and lifecycle webhook fixtures or real staging events, then confirm template state and lifecycle state update through the async processors.
15. Inspect `auditLogs`, `dashboardNotifications`, `whatsappTemplateSyncLogs`, and `wabaLifecycleEvents` to confirm the new production-rule flows remain observable.

## Notes

- S3-compatible media storage is optional in phase 11. If object storage env vars are absent, metadata fetch plus transcript or summary enrichment can still run without upload.
- Phase 11 focuses on transport compliance and media understanding, not analytics or billing. Those remain phase-12 work.
