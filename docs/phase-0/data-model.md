# Data Model Draft

This is the phase-0 reference model for schema design. It is intentionally descriptive rather than implementation-specific.

## Identity And Tenancy

### `users`

- Clerk user mapping
- User locale preference
- Default organization

### `organizations`

- Organization identity
- Billing profile
- Default locale

### `orgMembers`

- Membership and role mapping for owner, admin, agent, viewer

### `auditLogs`

- Sensitive configuration and access events

## Bot And AI Configuration

### `botProfiles`

- `organizationId`
- `name`
- `defaultLanguage`
- `systemPrompt`
- `localizedPromptTemplates`
- `modelPolicy`
- `createdAt`
- `updatedAt`

### `botConfigs`

- Per-bot settings split out if profile payload becomes too large

### `modelProviderSettings`

- Encrypted provider credentials
- Provider type, endpoint, model, timeout policy

### `promptVersions`

- Immutable prompt snapshots used by `aiRuns`

### `aiRuns`

- Provider, model, latency, tokens, RAG usage, and prompt version

### `aiLogs`

- Detailed operational logs and guardrail decisions

### `aiUsage`

- Aggregated token or cost usage

## Knowledge Base

### `knowledgeSources`

- Source type: inline, pdf, website
- Source metadata including URL and scraper provider

### `documents`

- Canonical normalized Markdown
- Content hash
- Title and provenance metadata

### `documentChunks`

- Chunk text, embeddings, and retrieval metadata

### `kbUsageLogs`

- Retrieved sources, chunk ids, scores, and run linkage

## WhatsApp Integration

### `whatsappIntegrations`

- WABA ids and phone number ids
- Encrypted access token and app secret
- Hashed verify token
- Webhook, WABA, phone verification, and sync status
- Default reply mode and activation status

### `whatsappWebhookEvents`

- Raw inbound, status, template, and lifecycle events
- Signature validity
- Processing status
- Attempt count

### `whatsappContacts`

- WA identity and service-window state
- Active conversation linkage
- Opt-out flag

### `whatsappMessages`

- Transport-level inbound and outbound rows
- Provider ids, direction, type, and transport status

### `whatsappOutboundQueue`

- One queue row per outbound transcript message
- Retry state, next attempt time, and provider message id

### `whatsappTemplates`

- Template identity, language, category, approval state, and rejection reason

### `whatsappMedia`

- Media metadata, object storage key, transcript or summary, and processing status

### `whatsappTemplateSyncLogs`

- Pull and push sync outcomes

### `wabaLifecycleEvents`

- Meta approval, OTP, business profile sync, and messaging tier events

## Conversation Layer

### `conversations`

- Channel, state, assignment, handoff, bot pause, and service-window warnings

### `messages`

- Channel-agnostic transcript rows
- Role, content, source, content type, delivery state, and transport linkage

### `conversationAssignments`

- Optional assignment history

### `conversationEvents`

- System-level state transitions such as pause, handoff, reopen, and close

### `dashboardNotifications`

- Queue failures, expiring windows, template rejections, and WABA blockers

## Billing

### `plans`

- Plan definition and limits

### `subscriptions`

- Provider-agnostic entitlement state

### `usageCounters`

- Messages, AI tokens, documents, seats, and phone number usage

### `invoices`

- Internal invoice references

### `billingEvents`

- Raw provider-native webhook payloads plus normalized processing metadata

## Indexing And Integrity Rules

- Unique outbound queue index on `messageId`
- Unique outbound queue index on `idempotencyKey`
- Event dedupe key for webhook events
- Queue lookup by `(status, nextAttemptAt)`
- Transport lookup by provider message id
- Tenant-scoped indexes for common dashboard reads

## Transactional Rules

- Contact upsert refreshes `lastInboundAt` and `serviceWindowExpiresAt` together.
- One outbound transcript message produces at most one outbound queue row.
- Orchestrator logic must be retry-safe under Convex optimistic concurrency.
- Subscription checks read from `subscriptions`, not raw `billingEvents`.
