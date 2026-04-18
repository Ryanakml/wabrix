# Product Requirements Document

## Product Summary

`wabrix` is a production-ready WhatsApp AI chatbot SaaS for businesses that need a configurable, prompt-driven assistant with reliable WhatsApp transport, knowledge retrieval, human handoff, analytics, and billing.

The product is WhatsApp-first, but the bot intelligence is not channel-specific. WhatsApp is the transport layer. Bot behavior is driven by admin-managed prompt, model configuration, RAG, and conversation context.

## Users

- Business owner setting up the bot and billing
- Admin configuring bot behavior, WhatsApp, templates, and knowledge
- Agent working inside the inbox and handling handoff
- Viewer inspecting conversations and analytics without making changes
- End customer messaging the business on WhatsApp

## Core Jobs To Be Done

- Connect a WhatsApp Business number safely.
- Configure bot identity, language behavior, and generation settings.
- Add business knowledge from text, PDFs, and websites.
- Let the bot answer customers inside WhatsApp rules.
- Pause the bot and hand the conversation to a human.
- Track delivery, failures, queue state, usage, and billing.

## MVP Scope

- Sign up, sign in, and organization setup
- Bot Studio with prompt and model configuration
- Knowledge base ingestion and RAG
- WhatsApp webhook ingress, normalization, and outbound delivery queue
- Inbox, handoff, manual replies, and operational state
- WABA lifecycle and template management
- Analytics, usage, and billing with Polar and Midtrans
- English and Bahasa Indonesia dashboard support

## Non-Goals

- No hardcoded intent router as the primary conversation engine
- No webhook handler that waits for LLM generation
- No direct Meta send from AI generation code
- No separate landing and dashboard apps in the first version
- No assumption that local template state equals Meta approval
- No dependence on DigitalOcean as a default provider path

## Product Principles

- Reliability first
- Prompt-driven bot behavior
- Tenant isolation by default
- Clear operational visibility
- Indonesian-market readiness from day one
- Minimal MVP surface, implemented correctly

## Success Criteria

- A business can connect WhatsApp and configure a bot without touching code.
- A customer inbound message becomes a stored transcript, optional AI draft, queued outbound send, and reconciled delivery state.
- Bot behavior follows admin prompt and knowledge, not rigid backend routing.
- Freeform outbound is blocked outside the WhatsApp service window.
- Admins can see setup blockers, queue failures, and delivery outcomes.

## Functional Requirements

### Auth And Tenancy

- Support Clerk-based auth and organizations.
- Enforce owner, admin, agent, and viewer roles.
- Record audit logs for sensitive changes.

### Bot Studio

- Store system prompt, localized prompt templates, tone, temperature, max tokens, and escalation settings.
- Support `defaultLanguage` with `auto`, `en`, and `id`.
- Use Gemini 2.5 Flash as the default generation model.

### Knowledge Base

- Support inline text, PDF, and website ingestion.
- Normalize all sources to Markdown before embedding.
- Use Firecrawl or Jina Reader first for websites.
- Use `gemini-embedding-001` for embeddings.

### WhatsApp Runtime

- Verify webhooks and POST signatures at the edge.
- Store raw events durably before downstream processing.
- Normalize inbound events into contacts, conversations, messages, and transport rows.
- Queue outbound sends durably and idempotently.
- Reconcile delivery, read, and failure statuses.

### Inbox And Handoff

- Show conversations, transcript, service window, assignment, and delivery state.
- Let admins or agents pause the bot and send manual replies.
- Require approved templates outside the 24-hour window.
- Support message translation for agents without mutating original content.

### Billing

- Route international billing to Polar with USD.
- Route Indonesia billing to Midtrans with IDR.
- Keep entitlement state provider-agnostic in Convex.

## User Experience Requirements

- Onboarding must be guided, not empty.
- Dashboard language defaults to English but can switch to Bahasa Indonesia.
- Indonesian users should get local-friendly setup, language defaults, and payment behavior.
- Operational failures must be visible and inspectable.

## Constraints

- WhatsApp service window rules are enforced in backend logic.
- Ingress must remain fast and minimal.
- Secrets must never be exposed to the frontend.
- Observability must redact sensitive values.

## Open Decisions For Approval

- Firecrawl vs Jina Reader primary vendor order for website ingestion
- Helicone vs Axiom as the default LLM observability product
- Gemini multimodal vs Whisper as the first transcription implementation
