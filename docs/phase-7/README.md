# Phase 7: Inbound Processor And Conversation Mapping

Phase 7 is implemented.

## Implemented

- Added inbound transcript and conversation tables in [packages/backend/convex/schema.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/schema.ts):
  - `whatsappContacts`
  - `conversations`
  - `messages`
  - `whatsappMessages`
  - `whatsappMedia`
- Extended `whatsappWebhookEvents` processing state tracking in [packages/backend/convex/schema.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/schema.ts).
- Added inbound normalization, contact upsert, conversation reuse, transcript persistence, media job creation, and read-only inbox query logic in [packages/backend/convex/inbound.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/inbound.ts).
- Wired raw webhook storage to immediate downstream normalization scheduling in [packages/backend/convex/whatsappWebhookEvents.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/whatsappWebhookEvents.ts).
- Added the first read-only inbox dashboard surface in:
  - [apps/web/app/[locale]/dashboard/inbox/page.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/dashboard/inbox/page.tsx)
  - [apps/web/app/[locale]/dashboard/inbox/inbox-client.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/dashboard/inbox/inbox-client.tsx)
- Updated dashboard links and localized copy in:
  - [apps/web/app/[locale]/dashboard/page.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/dashboard/page.tsx)
  - [apps/web/messages/en.json](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/messages/en.json)
  - [apps/web/messages/id.json](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/messages/id.json)

## Behavior

- Raw WhatsApp message events are normalized into safe internal inbound rows.
- One inbound sender becomes one tenant-scoped `whatsappContact`.
- The active open conversation is reused when available; otherwise a new WhatsApp conversation is created.
- Every inbound payload message creates:
  - one transcript row in `messages`
  - one transport row in `whatsappMessages`
- Duplicate provider message ids do not create duplicate transcript rows.
- Unsupported payload types are stored safely as transcript content instead of crashing normalization.
- Voice notes create queued media records for download and transcript work.
- Images and documents create queued media records for download, storage, and summary work.
- `serviceWindowExpiresAt` is refreshed to `lastInboundAt + 24 hours` for inbound customer traffic.
- No bot auto-reply or outbound queue work is triggered yet.

## Automated Verification

- `npx convex codegen`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- Backend tests:
  - [packages/backend/__tests__/inbound.test.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/__tests__/inbound.test.ts)
  - [packages/backend/__tests__/whatsapp-webhook-events.test.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/__tests__/whatsapp-webhook-events.test.ts)

## Manual DoD Check

1. Make sure phase 6 staging ingress is already healthy and writing raw events durably.
2. Deploy the updated Convex schema and functions, then run `npx convex codegen`.
3. Send a real or staged inbound WhatsApp text payload through the phase-6 ingress path.
4. Confirm:
   - one `whatsappContact` is created or refreshed
   - one open `conversation` exists for that sender
   - one transcript `message` exists with role `user`
   - one linked `whatsappMessage` transport row exists
5. Resend the exact same inbound payload and confirm transcript rows do not duplicate.
6. Send a burst of multiple inbound text messages and confirm every message appears in transcript history.
7. Send a voice note payload and confirm a `whatsappMedia` row appears with queued transcript work.
8. Send an image or document payload and confirm `whatsappMedia` shows queued storage and summary work.
9. Inspect the contact row and confirm `serviceWindowExpiresAt = lastInboundAt + 24 hours`.
10. Open `/en/dashboard/inbox` and confirm the conversation appears in the read-only inbox view with recent transcript rows and any media-debug records.
11. Confirm no bot reply or outbound queue row is created yet.

## Notes

- Phase 7 deliberately stops before bot orchestration, debounce timing, and outbound queue creation.
- The inbox surface is intentionally read-only in this phase. Assignment, handoff, and reply actions land later.
