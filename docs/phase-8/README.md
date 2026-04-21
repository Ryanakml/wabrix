# Phase 8: Bot Orchestrator And Reply Queue

Phase 8 is implemented.

## Implemented

- Added bot orchestration state, outbound queue rows, and dashboard notifications in [packages/backend/convex/schema.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/schema.ts).
- Added optimistic-concurrency-safe orchestrator mutations in [packages/backend/convex/orchestrator.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/orchestrator.ts).
- Added the AI draft action runner and RAG-aware bot reply generation in [packages/backend/convex/orchestratorAction.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/orchestratorAction.ts).
- Added organization-scoped runtime access helpers in:
  - [packages/backend/convex/configuration.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/configuration.ts)
  - [packages/backend/convex/knowledge.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/knowledge.ts)
- Wired inbound text messages to debounce scheduling in [packages/backend/convex/inbound.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/inbound.ts).
- Expanded the inbox surface to show bot reply state, outbound queue rows, and notifications in:
  - [apps/web/app/[locale]/dashboard/inbox/page.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/dashboard/inbox/page.tsx)
  - [apps/web/app/[locale]/dashboard/inbox/inbox-client.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/dashboard/inbox/inbox-client.tsx)

## Behavior

- Inbound text messages now schedule bot orchestration with a durable debounce window.
- The orchestrator claims only one eligible conversation at a time.
- Bot pause, handoff, and closed service windows block freeform AI replies in backend logic.
- One successful AI draft creates:
  - one assistant transcript row in `messages`
  - one queued outbound transport row in `whatsappMessages`
  - one durable outbound queue row in `outboundQueue`
- Spammy inbound bursts are preserved in transcript history but coalesced before AI generation.
- Service windows expiring within 30 minutes flag the conversation and create a dashboard notification.
- Bot reply failures create a dashboard notification and visible conversation error state.
- Phase 8 still stops before Meta send execution and delivery-status reconciliation.

## Automated Verification

- `npx convex codegen` from [packages/backend](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend)
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- New backend coverage:
  - [packages/backend/__tests__/orchestrator.test.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/__tests__/orchestrator.test.ts)

## Manual DoD Check

1. Deploy the updated Convex schema and functions to staging, then run `npx convex codegen` from `packages/backend`.
2. Confirm Bot Studio is configured with a valid AI key and the active org already has a real WhatsApp integration plus bot profile.
3. Send one inbound WhatsApp text message through the staging ingress.
4. Confirm the same conversation moves through bot reply state progression and finishes with:
   - one assistant `messages` row
   - one queued outbound `whatsappMessages` row
   - one `outboundQueue` row
5. Send a burst of multiple inbound text messages quickly and confirm transcript rows all persist while only one new outbound queue job is created after debounce.
6. Set `botPaused = true` on the conversation, send another inbound text, and confirm no new assistant message or outbound queue row is created.
7. Set `handoffRequested = true` on the conversation, send another inbound text, and confirm no new assistant message or outbound queue row is created.
8. Set `serviceWindowExpiresAt` in the past, send another inbound text, and confirm backend logic blocks the freeform bot reply with no queue row.
9. Set `serviceWindowExpiresAt` to within 30 minutes and run the expiring-window path, then confirm `serviceWindowExpiringSoon = true` and a `dashboardNotifications` row exists.
10. Trigger an AI failure case, for example by temporarily breaking the bot provider config in staging, then confirm the conversation shows failed bot reply state and a dashboard notification is written.
11. Open `/en/dashboard/inbox` and confirm conversation state, queue visibility, and notifications are all visible from the dashboard.

## Notes

- Phase 8 drafts and queues replies only. It does not send them to Meta yet.
- Phase 9 is responsible for outbound dispatch, retries, provider idempotency, and delivery-status reconciliation.
