# Phase 9: Outbound Sender And Status Reconciliation

Phase 9 is implemented.

## Implemented

- Added outbound send and status-reconciliation schema support in [packages/backend/convex/schema.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/schema.ts).
- Added durable outbound queue claim, retry, failure, and status-reconciliation mutations in [packages/backend/convex/outbound.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/outbound.ts).
- Added the WhatsApp Graph sender action in [packages/backend/convex/outboundAction.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/outboundAction.ts).
- Added sender runtime access to the encrypted WhatsApp integration in [packages/backend/convex/whatsapp.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/whatsapp.ts).
- Wired queue creation to immediate dispatch scheduling in [packages/backend/convex/orchestrator.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/orchestrator.ts).
- Wired raw `statuses` webhooks to async reconciliation in [packages/backend/convex/whatsappWebhookEvents.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/whatsappWebhookEvents.ts).
- Extended ingress coverage for signed status webhook durability in [apps/ingress/src/index.test.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/ingress/src/index.test.ts).
- Added backend outbound verification coverage in [packages/backend/__tests__/outbound.test.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/__tests__/outbound.test.ts).

## Behavior

- When phase-8 orchestration drafts a reply, the new outbound queue row is scheduled for immediate async dispatch.
- The sender claims exactly one eligible queue job with a durable `claimToken` so duplicate workers do not double-send the same transcript message.
- The worker rechecks the 24-hour service window immediately before send. If the window is already closed, the queue job fails without calling Meta.
- Outbound text sends include the durable queue `idempotencyKey` as `X-Idempotency-Key`.
- Successful sends store the Meta provider message id, move queue state to `sent`, and update transcript plus transport rows.
- Retryable failures back off exponentially from the queue attempt count and reschedule the same queue job with the same idempotency key.
- Permanent failures mark the queue row failed, update the transcript delivery state, and create a dashboard notification with the failure reason.
- Signed WhatsApp `statuses` webhooks are stored raw by the ingress worker, then normalized asynchronously into `sent`, `delivered`, `read`, or `failed` transport state.
- Status reconciliation updates `whatsappMessages`, transcript `messages`, conversation metadata, and linked queue rows without creating duplicate sends.

## Automated Verification

- `npx convex codegen` from [packages/backend](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend)
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- New verification coverage:
  - [packages/backend/__tests__/outbound.test.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/__tests__/outbound.test.ts)
  - [apps/ingress/src/index.test.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/ingress/src/index.test.ts)

## Manual DoD Check

1. Deploy the updated Convex schema and functions to staging, then run `npx convex codegen` from `packages/backend`.
2. Confirm the active org already has a real bot profile, a configured WhatsApp integration, and a healthy phase-8 orchestrator flow.
3. Send one inbound WhatsApp text message through staging ingress and wait for the bot to draft a reply.
4. Confirm the bot reply creates one queued `outboundQueue` row and then transitions to `sent` after the worker calls Meta.
5. Inspect `whatsappMessages` and confirm the outbound transport row now stores the provider message id returned by Meta.
6. Resend or retrigger the same dispatcher path and confirm no duplicate outbound send happens for the same queue job or message id.
7. Force one retryable Meta failure, for example with a temporary mock or invalid transient upstream response, and confirm the queue row increments `attemptCount`, keeps the same `idempotencyKey`, and sets a future `nextAttemptAt`.
8. Force one permanent Meta failure, for example with a permanently invalid payload or credential, and confirm the queue row becomes `failed`, the transcript message becomes `failed`, and a `dashboardNotifications` row is created with the reason.
9. Push the service window into the past before a queued send runs and confirm the sender blocks the freeform send before Meta is called.
10. Send or replay a real signed WhatsApp `statuses` webhook payload and confirm the raw event lands in `whatsappWebhookEvents` with `eventType = statuses`.
11. After the async processor runs, confirm `whatsappMessages.transportStatus` and `messages.deliveryState` move through `sent`, `delivered`, `read`, or `failed` based on the webhook payload.
12. Open `/en/dashboard/inbox` and confirm queue attempts, failures, and status-driven conversation state are visible from the dashboard.

## Notes

- Phase 9 only sends outbound text replies created by the orchestrator. Templates and richer outbound content types still belong to later phases.
- Phase 10 should build on this queue and status foundation for agent assignment, manual replies, and human handoff operations.
