# Phase 5: WhatsApp Integration Config

Phase 5 is implemented.

## Implemented

- Added tenant-scoped WhatsApp integration persistence in [packages/backend/convex/schema.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/schema.ts):
  - `whatsappIntegrations`
- Added WhatsApp integration queries, mutations, access checks, and frontend-safe state shaping in [packages/backend/convex/whatsapp.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/whatsapp.ts).
- Extended encrypted secret helpers in [packages/backend/convex/lib/crypto.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/lib/crypto.ts) so the verify token is stored as a hash while the access token and app secret stay encrypted at rest.
- Added the localized WhatsApp setup dashboard in:
  - [apps/web/app/[locale]/dashboard/whatsapp/page.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/dashboard/whatsapp/page.tsx)
  - [apps/web/app/[locale]/dashboard/whatsapp/whatsapp-settings-client.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/dashboard/whatsapp/whatsapp-settings-client.tsx)
- Updated dashboard navigation and localized copy in:
  - [apps/web/app/[locale]/dashboard/page.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/dashboard/page.tsx)
  - [apps/web/messages/en.json](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/messages/en.json)
  - [apps/web/messages/id.json](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/messages/id.json)
- Updated runtime/config wiring in:
  - [.env.example](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/.env.example)
  - [turbo.json](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/turbo.json)
  - [packages/config/src/index.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/config/src/index.ts)

## Behavior

- Each organization has one WhatsApp integration record scoped by `organizationId`.
- The record is linked to the active Bot Studio bot profile before it can be saved.
- `accessToken` and `appSecret` are encrypted at rest.
- `verifyToken` is stored only as a hash.
- Frontend queries expose configured or not-configured booleans instead of raw secrets.
- The dashboard displays the exact webhook URL derived from `NEXT_PUBLIC_INGRESS_URL`.
- Audit logs capture credential-change events without storing raw secret values.
- Integrations can be disabled without deleting the stored setup state.

## Automated Verification

- `npx convex codegen`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- Backend tests:
  - [packages/backend/__tests__/whatsapp.test.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/__tests__/whatsapp.test.ts)
- Frontend tests:
  - [apps/web/__tests__/whatsapp-settings.test.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/__tests__/whatsapp-settings.test.tsx)

## Manual DoD Check

1. Copy [.env.example](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/.env.example) to `.env.local` and set `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_INGRESS_URL`, Clerk values, and `ENCRYPTION_SECRET`.
2. Run `pnpm dev`.
3. Sign in as an organization admin and make sure Bot Studio is configured for the active tenant.
4. Open `/en/dashboard/whatsapp`.
5. Fill `phone number ID`, `business account ID`, `access token`, `app secret`, and `verify token`, then enable the integration and save.
6. Refresh the page and confirm:
   - the IDs remain visible
   - the secret inputs are blank again
   - the credential status cards show `Configured`
   - the connection status is `configured`
7. Confirm the displayed webhook URL matches the `NEXT_PUBLIC_INGRESS_URL` base configured locally.
8. Inspect Convex data and confirm `whatsappIntegrations` stores encrypted token fields and a hashed verify token instead of raw secret values.
9. Inspect Convex data and confirm `auditLogs` contains a `whatsapp_integration_saved` row without raw secret values in `details`.
10. Switch to another organization and confirm the integration state does not leak across tenants.
11. Disable the integration, save again, and confirm the connection status changes to `disabled`.

## Notes

- Phase 5 stops at secure configuration storage and dashboard management. It does not yet implement webhook verification, raw inbound persistence, or outbound delivery.
- The webhook URL is intentionally surfaced before phase 6 so Meta-side setup can be prepared without exposing runtime secrets.
