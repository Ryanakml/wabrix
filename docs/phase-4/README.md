# Phase 4: Knowledge Base And RAG

Phase 4 is implemented.

## Implemented

- Added knowledge-base persistence tables in [packages/backend/convex/schema.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/schema.ts):
  - `knowledgeSources`
  - `knowledgeChunks`
  - `knowledgeUsageLogs`
- Added tenant-scoped knowledge queries and mutations in [packages/backend/convex/knowledge.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/knowledge.ts).
- Added node-based ingestion action in [packages/backend/convex/knowledgeActions.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/knowledgeActions.ts).
- Added markdown normalization, chunking, URL blocking, website ingestion, embedding, and similarity helpers in [packages/backend/convex/lib/knowledge.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/lib/knowledge.ts).
- Extended the Bot Studio emulator in [packages/backend/convex/ai.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/ai.ts) so it retrieves relevant knowledge chunks, injects them into the prompt, and logs RAG usage.
- Added the localized dashboard Knowledge Base UI in:
  - [apps/web/app/[locale]/dashboard/knowledge-base/page.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/dashboard/knowledge-base/page.tsx)
  - [apps/web/app/[locale]/dashboard/knowledge-base/knowledge-base-client.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/dashboard/knowledge-base/knowledge-base-client.tsx)
- Added dashboard navigation and localized copy updates in:
  - [apps/web/app/[locale]/dashboard/page.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/app/%5Blocale%5D/dashboard/page.tsx)
  - [apps/web/messages/en.json](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/messages/en.json)
  - [apps/web/messages/id.json](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/messages/id.json)

## Behavior

- Inline knowledge sources are stored as normalized Markdown before chunking.
- Website ingestion uses Jina Reader first, Firecrawl as the secondary hosted option when configured, and a Cheerio plus Markdown fallback only after those paths.
- Private and internal URLs are blocked before website ingestion.
- Embeddings use `gemini-embedding-001`.
- Retrieval is tenant-scoped and bot-scoped.
- Bot Studio preview now shows whether knowledge was matched and which source titles were used.
- Knowledge retrieval usage is logged in `knowledgeUsageLogs`.

## Intentional Deferral

- PDF ingestion is intentionally deferred in phase 4. The UI keeps the PDF path visible but disabled and the backend marks it as deferred rather than pretending it works.
- Full browser-authenticated Playwright coverage still needs a dedicated Clerk harness. The automated phase-4 suite is unit and component based.

## Automated Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- Backend tests:
  - [packages/backend/__tests__/knowledge-utils.test.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/__tests__/knowledge-utils.test.ts)
  - [packages/backend/__tests__/knowledge-ingestion.test.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/__tests__/knowledge-ingestion.test.ts)
  - [packages/backend/__tests__/knowledge-access.test.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/__tests__/knowledge-access.test.ts)
  - [packages/backend/__tests__/ai.test.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/__tests__/ai.test.ts)
- Frontend tests:
  - [apps/web/__tests__/knowledge-base.test.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/__tests__/knowledge-base.test.tsx)
  - [apps/web/__tests__/bot-studio.test.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/__tests__/bot-studio.test.tsx)

## Manual DoD Check

1. Set `.env.local` with `NEXT_PUBLIC_CONVEX_URL`, Clerk values, `ENCRYPTION_SECRET`, and `GOOGLE_GENERATIVE_AI_API_KEY`. `FIRECRAWL_API_KEY` is optional.
2. Run `pnpm dev`.
3. Sign in as an organization admin and open `/en/dashboard/knowledge-base`.
4. Add an inline knowledge source and confirm it appears in the saved source list with a Markdown preview.
5. Add a website source using a public URL and confirm it is stored successfully.
6. Inspect Convex data and confirm:
   - `knowledgeSources` stores Markdown content, source metadata, and chunk counts
   - `knowledgeChunks` stores embeddings and chunk text
7. Try a blocked URL such as `http://127.0.0.1/test` and confirm ingestion is rejected.
8. Open `/en/dashboard/bot-studio` and run the emulator with a question answerable from the new knowledge.
9. Confirm the emulator shows knowledge retrieval status, a positive chunk count, and one or more matched source titles.
10. Inspect Convex data and confirm `knowledgeUsageLogs` receives a new retrieval row after the emulator run.
11. Switch to another organization and confirm that sources, chunks, previews, and retrieval results do not bleed across tenants.
12. Confirm the PDF option stays visibly deferred rather than claiming upload support.

## Notes

- Phase 4 intentionally stops before WhatsApp integration credentials, inbound normalization, queues, and inbox workflows.
- Retrieval is implemented as scoped cosine similarity over stored embeddings for the MVP. It is sufficient for the current phase but not positioned as a high-scale ANN index yet.
