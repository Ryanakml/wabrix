# Security, Testing, And Risk

## Security Model

### Core Controls

- Tenant-scoped queries and mutations
- Role-based access control for owner, admin, agent, viewer
- Encrypted server-side secret storage
- Secret redaction in frontend responses and logs
- Audit logs for credential and role changes
- Edge raw-body signature validation before parsing
- Backend enforcement of WhatsApp service-window rules
- Input validation with Zod
- Rate limits on public and operationally sensitive paths

### Sensitive Assets

- WhatsApp access tokens
- WhatsApp app secrets
- Provider API keys
- Contact identifiers and phone numbers
- Customer message content
- Billing identifiers and webhook payloads

### Threat Model Summary

| Threat                                       | Primary Mitigation                                                    |
| -------------------------------------------- | --------------------------------------------------------------------- |
| Forged webhook request                       | HMAC validation on exact raw bytes                                    |
| Replay or duplicate webhook                  | Event-key dedupe and idempotent processors                            |
| Tenant data exposure                         | Membership-scoped access and redaction                                |
| Prompt injection via user or knowledge input | Guardrail preprocessing and context sanitation                        |
| Queue duplication                            | Unique queue constraints and retry-on-same-row design                 |
| Secret exposure in UI or logs                | Encryption at rest plus frontend-safe queries                         |
| Freeform reply outside allowed window        | Convex-side service-window guard                                      |
| Billing entitlement drift                    | Verified webhook processing into provider-agnostic subscription state |

## Failure Mode Review

### Webhook And Ingress

- If signature validation fails, reject and log.
- If Convex raw-event persistence fails, do not claim success to Meta.
- If one phone number bursts, edge throttling must not block other numbers.

### Queue And Send

- Retryable Meta errors reschedule the same queue row with backoff.
- Permanent failures surface clear operator-visible error reasons.
- Sender revalidates the service window before Meta send to catch queue delay expiry.

### AI Runtime

- Timeout is bounded per request.
- Provider errors are logged with latency and model metadata.
- Observability failures must not block core message flow.
- AI output never bypasses queueing.

### Billing

- Client-side success pages do not change entitlements.
- Duplicate provider webhooks are idempotent.
- Failed provider webhook processing is inspectable and retryable.

## Testing Strategy

### Unit

- Signature validation
- Dedupe and event-key generation
- Retry backoff and rate-limit math
- Service-window checks
- Prompt builder and injection detection
- Markdown normalization and RAG helpers
- Redaction and locale helpers

### Backend Integration

- Tenant creation and scoped reads
- Bot config and encrypted secret storage
- Raw webhook storage and inbound normalization
- Orchestrator debounce, queue creation, and service-window enforcement
- Status reconciliation
- Billing webhook normalization and provider-agnostic subscription updates

### Frontend

- Onboarding, Bot Studio, knowledge forms, WhatsApp setup, inbox, templates, analytics, billing
- English and Bahasa Indonesia rendering
- Disabled freeform composer when the service window is closed

### End-To-End

- Signup to organization onboarding
- Fake WhatsApp integration and inbound fixture
- Inbox display, bot pause, handoff, and manual reply
- Locale switching
- Billing sandbox checkout paths

### Manual Runbooks

- Webhook verification
- Signed webhook fixtures
- Real test number inbound and outbound
- Queue retry simulation
- Prompt-injection simulation
- Media transcription and summary flow
- Template approval sync
- Service-window expiry notification
- Billing sandbox flows

## Review Blocking Issues

Phase 0 must not be approved if any of these remain unresolved:

- Service-window enforcement is only specified in UI terms
- Ingress responsibilities include AI or outbound business logic
- Duplicate-send prevention is not clearly defined
- Tenant isolation is not explicit at the data-access layer
- Raw HTML embedding is still allowed in the RAG path
- Billing entitlement logic still depends on unverified client-side success
