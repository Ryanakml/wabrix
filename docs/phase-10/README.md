# Phase 10: Inbox, Handoff, And Agent Tools

Phase 10 is implemented.

## Implemented

- Added phase-10 inbox control schema in [packages/backend/convex/schema.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/schema.ts).
- Added inbox query and operator mutations in [packages/backend/convex/inbox.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/inbox.ts).
- Added on-demand inbox translation support in [packages/backend/convex/ai.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/ai.ts).
- Replaced the read-only inbox with a three-panel operator workspace in:
  - [apps/web/app/[locale]/dashboard/inbox/page.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/dashboard/inbox/page.tsx)
  - [apps/web/app/[locale]/dashboard/inbox/inbox-client.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/dashboard/inbox/inbox-client.tsx)
- Added backend phase-10 verification in [packages/backend/__tests__/inbox.test.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/__tests__/inbox.test.ts).
- Added frontend inbox workspace verification in [apps/web/__tests__/inbox.test.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/__tests__/inbox.test.tsx).

## Behavior

- Inbox now renders as an operator workspace with a conversation table, active thread, and details panel.
- Conversation list supports search plus sort modes for most recent, oldest, and needs-human-first triage.
- Agents can assign conversations to team members, pause bot replies, toggle handoff, and close or reopen the conversation from the inbox.
- Internal notes are stored separately from the customer transcript and are visible only in the operator workspace.
- Manual human replies go through the same durable outbound queue from phase 9 instead of bypassing transport safeguards.
- Backend freeform manual replies are blocked if the conversation is closed or the 24-hour WhatsApp service window has expired.
- When the service window is closed, the inbox surfaces template fallback suggestions as operator guidance instead of sending unsafe freeform text.
- The thread can be translated on demand through the existing tenant AI runtime without overwriting the stored original transcript.
- WABA lifecycle cards now show approval, OTP, webhook, profile-sync, and connection state directly inside the inbox.

## Automated Verification

- `npx convex codegen` from [packages/backend](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend)
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- New verification coverage:
  - [packages/backend/__tests__/inbox.test.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/__tests__/inbox.test.ts)
  - [apps/web/__tests__/inbox.test.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/__tests__/inbox.test.tsx)

## Manual DoD Check

1. Deploy the updated Convex schema and functions to staging, then run `npx convex codegen` from `packages/backend`.
2. Open `/en/dashboard/inbox` with an org that already has a real WhatsApp integration, live conversations, and a configured bot runtime.
3. Confirm the conversation table renders, search works, and the needs-human sort bubbles paused, handoff, or expiring conversations upward.
4. Select a conversation and confirm the thread panel renders transcript rows with delivery state plus the details panel renders WABA lifecycle, queue rows, and notifications.
5. Change the assignee and confirm the conversation shows the new team member after refresh.
6. Toggle bot pause on, send a fresh inbound message, and confirm the bot does not auto-reply while the conversation stays in manual control.
7. Toggle handoff on, send another inbound message, and confirm the bot still stays blocked.
8. Add an internal note and confirm it appears in the details panel without appearing in the customer-facing transcript.
9. While the 24-hour service window is open, send a manual reply and confirm the new `messages`, `whatsappMessages`, and `outboundQueue` rows are created through the queue path.
10. Force the service window closed and confirm the manual freeform composer becomes disabled in the UI and backend rejects a freeform send.
11. Use the translation toggle and confirm translated thread content renders while the original stored transcript text still remains visible or recoverable.
12. Close the conversation, verify manual reply is blocked, then reopen it and confirm agent controls become available again.

## Notes

- Phase 10 intentionally stops short of real Meta-approved template dispatch. The inbox only surfaces template fallback guidance; actual template sending belongs to phase 11.
- Full Clerk-authenticated Playwright inbox E2E is still a follow-up item if you want browser-level automation beyond the current component and backend coverage.
