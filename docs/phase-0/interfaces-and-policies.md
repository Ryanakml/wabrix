# Interfaces And Policies

## Service Boundaries

### Hono Ingress To Convex Contract

The ingress worker sends a trusted internal write containing:

- computed `eventKey`
- `eventType`
- raw provider payload
- signature validation result
- provider ids when available
- `receivedAt`

The contract guarantees:

- the worker already validated GET or POST requirements
- raw payload is preserved for later inspection
- downstream processors can treat the event as durable input

## API And Function Boundary Draft

### Ingress

- `GET /webhooks/whatsapp`
  - Verifies Meta challenge with configured verify token.
- `POST /webhooks/whatsapp`
  - Validates `X-Hub-Signature-256` on exact raw bytes.
  - Applies per-`phoneNumberId` rate limit.
  - Persists raw event.
  - Returns quickly.

### Convex Internal Flow

- `storeRawWhatsappEvent`
- `processWhatsappWebhookEvent`
- `normalizeInboundWhatsappMessage`
- `scheduleMediaDownload`
- `orchestrateBotReply`
- `generateBotReplyDraft`
- `enqueueOutboundWhatsappMessage`
- `processOutboundWhatsappQueue`
- `reconcileWhatsappStatusEvent`
- `processBillingWebhook`

## Gemini Runtime Policy

- Primary generation model is `gemini-2.5-flash`.
- Standard embedding model is `gemini-embedding-001`.
- Generation uses per-request timeouts.
- Provider, model, latency, usage, and redacted prompt metadata are logged.
- AI code returns a draft only. It does not send transport messages or mutate outbound queue state directly.

Recommended runtime shape:

```ts
generateWithPrimaryModel({
  organizationId,
  botId,
  conversationId,
  messages,
  systemPrompt,
  ragContext,
  timeoutMs,
});
```

## Optional DigitalOcean Reference Policy

- DigitalOcean custom endpoints are not part of the default runtime path.
- If added later, they must live behind an isolated adapter.
- Provider ordering, endpoint URL, model id, and API keys must remain database-driven and tenant-specific.
- Future adapter work must include timeout, structured-output, and accounting behavior.

## AI Safety And Prompt-Injection Policy

- Every inbound user text and media summary passes through a guardrail step before final prompt assembly.
- Guardrail detects phrases such as "ignore previous instructions", "forget all rules", and Bahasa Indonesia equivalents.
- Suspicious instruction-like content from documents or websites is quarantined from normal RAG context.
- High-risk cases may trigger a secondary guardrail model.
- Guardrail logs decision, category, confidence, and sanitized metadata.
- System prompt text must never be exposed back to users.

## RAG Ingestion Policy

- Firecrawl or Jina Reader is the default website-ingestion path.
- Cheerio is only a fallback for simple static sites.
- Every source becomes normalized Markdown before chunking or embedding.
- Raw HTML is never embedded directly.
- Retrieval logs record source ids, chunk ids, scores, and scraper provider.

## Media Processing Policy

- Voice notes, images, and documents are first-class inputs.
- Media download is scheduled immediately after inbound normalization.
- Meta media fetch must start within a narrow deadline from `receivedAt`.
- Files are stored in R2 when retention policy allows.
- Voice notes are transcribed.
- Images and documents produce summaries or safe extracted text.
- AI context uses labeled summaries or transcripts, not raw binary payloads.

## Localization Policy

- Dashboard i18n uses `next-intl`.
- English is the default dashboard locale.
- Bahasa Indonesia support ships from day one.
- User preference, browser locale, organization setting, and Geo-IP guide locale selection.
- Bot runtime language is variable-driven using bot default language, detected user language, and conversation locale.
- AI runtime does not hardcode output language.

## Billing Policy

- Geo-IP sets default payment routing, but checkout confirms billing country.
- `polar` plus `USD` is the international default.
- `midtrans` plus `IDR` is the Indonesia default.
- Provider-specific webhook parsing ends at normalization boundaries.
- Entitlements are stored in provider-agnostic subscription records.
