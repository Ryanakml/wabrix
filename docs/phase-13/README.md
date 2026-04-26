# Phase 13: Landing Page, SEO, Docs, And Growth

Phase 13 is implemented.

## Implemented

- Replaced the old phase-1 landing with a localized marketing route group in:
  - [apps/web/app/[locale]/(marketing)/layout.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/(marketing)/layout.tsx)
  - [apps/web/app/[locale]/(marketing)/page.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/(marketing)/page.tsx)
  - [apps/web/components/marketing/public-shell.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/components/marketing/public-shell.tsx)
- Rebuilt public pricing with shadcn-based sections and phase-12 billing logic in:
  - [apps/web/app/[locale]/(marketing)/pricing/page.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/(marketing)/pricing/page.tsx)
  - [apps/web/app/[locale]/(marketing)/pricing/pricing-client.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/(marketing)/pricing/pricing-client.tsx)
- Added public docs routes backed by real markdown content in:
  - [apps/web/app/[locale]/(marketing)/docs/page.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/(marketing)/docs/page.tsx)
  - [apps/web/app/[locale]/(marketing)/docs/[slug]/page.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/(marketing)/docs/%5Bslug%5D/page.tsx)
  - [apps/web/lib/marketing-docs.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/lib/marketing-docs.ts)
- Added the exact public markdown stubs required by phase 13:
  - [apps/web/content/docs/en/whatsapp-setup.md](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/content/docs/en/whatsapp-setup.md)
  - [apps/web/content/docs/en/waba-lifecycle.md](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/content/docs/en/waba-lifecycle.md)
  - [apps/web/content/docs/en/template-approval.md](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/content/docs/en/template-approval.md)
  - [apps/web/content/docs/en/service-window-rules.md](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/content/docs/en/service-window-rules.md)
  - [apps/web/content/docs/id/whatsapp-setup.md](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/content/docs/id/whatsapp-setup.md)
  - [apps/web/content/docs/id/waba-lifecycle.md](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/content/docs/id/waba-lifecycle.md)
  - [apps/web/content/docs/id/template-approval.md](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/content/docs/id/template-approval.md)
  - [apps/web/content/docs/id/service-window-rules.md](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/content/docs/id/service-window-rules.md)
- Added marketing SEO helpers and social image surfaces in:
  - [apps/web/lib/marketing-metadata.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/lib/marketing-metadata.ts)
  - [apps/web/app/opengraph-image.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/opengraph-image.tsx)
  - [apps/web/app/twitter-image.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/twitter-image.tsx)
- Updated localized copy and phase label in:
  - [apps/web/messages/en.json](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/messages/en.json)
  - [apps/web/messages/id.json](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/messages/id.json)
  - [packages/config/src/index.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/config/src/index.ts)

## Behavior

- The public product story now matches the real backend and staging state instead of still describing the repo as a phase-1 shell.
- Marketing pages remain locale-aware through the existing `next-intl` App Router structure. English stays the default while Bahasa Indonesia is fully supported on public routes.
- Pricing keeps the real phase-12 rule:
  - Indonesia maps to `midtrans` with `IDR`
  - non-Indonesia traffic maps to `polar` with `USD`
- Public docs are no longer repo-only. Operators can now read setup and policy pages directly from the web app.
- `generateMetadata` now exists on all public phase-13 routes and points to OG/Twitter-ready social images.

## Automated Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- Existing non-blocking warning:
  - Next 16 still warns that `middleware.ts` is deprecated in favor of `proxy.ts`

## Manual DoD Check

1. Run `pnpm dev`.
2. Open `/en` and confirm the new premium marketing shell renders with hero, features, testimonials, CTA, and FAQ blocks.
3. Open `/id` and confirm the same marketing flow is translated into Bahasa Indonesia.
4. Open `/en/pricing` and confirm the public pricing page uses the new block layout instead of the old minimal phase-12 page.
5. Switch the pricing tabs between `Global` and `Indonesia` and confirm the provider and currency change between `polar/USD` and `midtrans/IDR`.
6. Open `/en/docs` and confirm the four operational docs cards render.
7. Open each docs article and confirm markdown content renders cleanly with navigation back to the docs index.
8. Inspect the page metadata in browser devtools or page source and confirm public routes include localized title, description, Open Graph, and Twitter metadata.
9. Share-test at least one public route and confirm the social image path resolves from `/opengraph-image` or `/twitter-image`.
10. Confirm the public nav links, locale switch, and footer links all resolve without broken routing.

## Notes

- Phase 13 intentionally focuses on public presentation, discoverability, and operator-friendly docs. It does not change the earlier billing or inbox runtime contracts.
- The marketing route group lives under `[locale]` instead of a root `(marketing)` route because this repo already committed to locale-first App Router URLs from earlier phases.
