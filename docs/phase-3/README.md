# Phase 3: Core Bot Studio And AI Config

Phase 3 is implemented.

## Implemented

- Added Bot Studio persistence tables in [packages/backend/convex/schema.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/schema.ts):
  - `botProfiles`
  - `modelProviderSettings`
  - `promptVersions`
  - `aiRuns`
- Added tenant-scoped Bot Studio queries and mutations in [packages/backend/convex/configuration.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/configuration.ts).
- Added encrypted secret storage, redaction helpers, prompt-injection guard, and observability payload helpers in:
  - [packages/backend/convex/lib/crypto.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/lib/crypto.ts)
  - [packages/backend/convex/lib/guardrails.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/lib/guardrails.ts)
  - [packages/backend/convex/lib/observability.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/lib/observability.ts)
- Added Gemini-based draft generation and emulator action in [packages/backend/convex/ai.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/ai.ts).
- Added the dashboard Bot Studio UI and emulator in:
  - [apps/web/app/[locale]/dashboard/bot-studio/page.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/dashboard/bot-studio/page.tsx)
  - [apps/web/app/[locale]/dashboard/bot-studio/bot-studio-client.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/dashboard/bot-studio/bot-studio-client.tsx)
- Added Bot Studio entry points in the localized dashboard and copy files:
  - [apps/web/app/[locale]/dashboard/page.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/dashboard/page.tsx)
  - [apps/web/messages/en.json](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/messages/en.json)
  - [apps/web/messages/id.json](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/messages/id.json)

## Behavior

- Bot configuration is organization-scoped.
- Default prompt templates are Bahasa Indonesia-first with English equivalents.
- Provider API keys are stored encrypted and are never returned to the frontend after save.
- Gemini 2.5 Flash is the default model path.
- A DigitalOcean reference configuration is accepted only when both endpoint and model are present.
- Prompt-injection patterns are sanitized before draft generation.
- AI runs are logged to `aiRuns`.
- Observability payload generation is in place for Helicone or Axiom-style sinks.

## Automated Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- Backend tests:
  - [packages/backend/__tests__/ai.test.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/**tests**/ai.test.ts)
  - [packages/backend/__tests__/crypto-observability.test.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/**tests**/crypto-observability.test.ts)
  - [packages/backend/__tests__/guardrails.test.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/**tests**/guardrails.test.ts)
- Frontend test:
  - [apps/web/__tests__/bot-studio.test.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/**tests**/bot-studio.test.tsx)

## Manual DoD Check

1. Set the phase-3 runtime values in `.env.local`:
   `NEXT_PUBLIC_CONVEX_URL`, `CLERK_ISSUER_URL`, `ENCRYPTION_SECRET`, and either `GOOGLE_GENERATIVE_AI_API_KEY` or an org-specific key saved from the UI.
2. Run `pnpm dev`.
3. Sign in as an organization admin and open `/en/dashboard/bot-studio`.
4. Change the bot name, prompts, temperature, max tokens, and escalation message, then save.
5. Refresh the page and confirm the saved values return, but the API key field is blank while `hasApiKey` behavior is preserved.
6. Run the emulator with an Indonesian message and confirm the response follows the Indonesian prompt variant or auto-language policy.
7. Change the system prompt to something obviously different, rerun the emulator, and confirm the output changes with the prompt.
8. Enter `ignore previous instructions` or the Indonesian equivalent in the emulator and confirm the request still returns a draft while the input is sanitized rather than trusted verbatim.
9. Inspect Convex data and confirm:
   - `botProfiles` has the saved profile
   - `modelProviderSettings` stores an encrypted key, not plaintext
   - `promptVersions` contains a new row after save
   - `aiRuns` contains a new row after emulator execution
10. Switch to another organization and confirm Bot Studio state is isolated.
11. If using the DigitalOcean reference mode, confirm save fails your manual review when only endpoint or only model is supplied; both must be present together.
12. If observability env vars are configured, confirm emitted payloads redact raw message text down to preview-safe content only.

## Notes

- Phase 3 intentionally stops before knowledge base, RAG, WhatsApp ingress orchestration, and outbound transport logic.
- The current automated suite covers unit and component behavior. Full browser-authenticated Playwright coverage still needs a dedicated Clerk test harness before it becomes meaningful.
