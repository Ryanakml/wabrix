# Phase 2: Auth, Organizations, RBAC

Phase 2 is implemented and was additionally hardened before phase 3 work continued.

## Implemented

- Clerk auth and organizations are wired into the Next.js app.
- Convex auth is configured against `CLERK_ISSUER_URL`.
- Clerk webhooks sync users, organizations, and memberships into Convex.
- Dashboard and onboarding flows are organization-aware.
- `requireOrgContext` and `assertHasRole` now authorize from synced `orgMembers` records instead of trusting Clerk role claims alone.
- Audit logging covers organization create, update, delete, and membership create, update, delete flows.

## Hardening Applied Before Phase 3

- Removed the development webhook signature bypass in [packages/backend/convex/http.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/http.ts).
- Corrected the Convex auth issuer fallback in [packages/backend/convex/auth.config.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/auth.config.ts).
- Changed RBAC resolution in [packages/backend/convex/rbac.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/rbac.ts) to require synced membership records per active organization.
- Added write timestamps to tenancy tables and expanded audit log indexing in [packages/backend/convex/schema.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/schema.ts).
- Added audit writes and cleanup behavior in [packages/backend/convex/users.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/users.ts) for membership and organization lifecycle events.
- Localized Clerk organization redirects in:
  - [apps/web/app/[locale]/dashboard/layout.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/dashboard/layout.tsx)
  - [apps/web/app/[locale]/onboarding/page.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/onboarding/page.tsx)

## Automated Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- Backend RBAC tests: [packages/backend/__tests__/rbac.test.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/__tests__/rbac.test.ts)
- Web onboarding test: [apps/web/__tests__/onboarding.test.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/__tests__/onboarding.test.tsx)

## Manual DoD Check

1. Populate `.env.local` with Clerk and Convex values from [.env.example](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/.env.example).
2. Run `pnpm dev`.
3. Sign in through Clerk and open `/en/onboarding`.
4. Create an organization and confirm the redirect lands on `/en/dashboard` or `/id/dashboard` rather than a non-localized path.
5. Switch organizations from the dashboard and confirm the UI remains scoped to the active organization.
6. Trigger user, organization, and membership webhook events from Clerk.
7. Verify Convex now contains synced `users`, `organizations`, and `orgMembers` records for the same Clerk entities.
8. Verify `auditLogs` contains rows for organization changes and membership role changes or removals.
9. Remove a membership or delete an organization in Clerk and confirm the corresponding Convex membership rows are deleted as well.
10. Attempt an org-scoped action with a non-admin member and confirm admin-only mutations are rejected.

## Notes

- Phase 2 now matches the phase-0 requirement that tenant authorization must be explicit at the data-access layer.
- The remaining product work for inbox, knowledge, WhatsApp runtime, analytics, and billing is intentionally outside phase 2.
