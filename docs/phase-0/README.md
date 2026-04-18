# Phase 0: Product Spec And Technical Design

This directory converts the master production plan into a phase-0 design pack that can be reviewed before code is written.

## Deliverables

- [PRD](./prd.md)
- [Architecture](./architecture.md)
- [Data Model](./data-model.md)
- [Interfaces And Policies](./interfaces-and-policies.md)
- [Security, Testing, And Risk](./security-testing-and-risk.md)
- [Release Plan](./release-plan.md)

## Phase Goal

Lock product scope and architecture before phase 1 implementation starts.

## Definition Of Done Tracking

| Item                      | Status         | Notes                               |
| ------------------------- | -------------- | ----------------------------------- |
| PRD written               | Complete       | See `prd.md`.                       |
| Architecture written      | Complete       | See `architecture.md`.              |
| Data model drafted        | Complete       | See `data-model.md`.                |
| Security risks documented | Complete       | See `security-testing-and-risk.md`. |
| Phase gates documented    | Complete       | See `release-plan.md`.              |
| Stakeholder approval      | Approved       | Phase 0 approved on 2026-04-18.     |

## Required Reviews

- Design review with checklist
- Threat model review
- Data model review
- Failure mode review for webhook, queue, AI, and Meta send
- Failure mode review for Gemini 2.5 Flash timeouts, provider errors, and observability gaps
- Compliance review for database-level WhatsApp service window enforcement
- Compliance review for template-only re-engagement outside the service window

## Review Checklist

- Runtime flow from inbound webhook to delivered reply is explainable end to end.
- MVP scope is clear and non-goals are explicit.
- Hono ingress boundary is limited to verification, validation, durability, and fast acknowledgement.
- Convex owns normalization, orchestration, queueing, and state transitions.
- AI generation never sends transport messages directly.
- WhatsApp 24-hour service window is enforced in backend logic, not only in UI.
- Freeform messages are blocked outside the service window.
- Template-only re-engagement is the only allowed path outside the service window.
- Raw-body signature validation is preserved.
- Edge rate limiting is scoped by `phoneNumberId`.
- Risk register is actionable and mapped to controls or later phases.

## Risk Register

| Risk                                                     | Impact                                               | Control                                                                                                           |
| -------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Webhook body consumed before HMAC validation             | Invalid security boundary, spoofed requests possible | Hono worker validates against exact raw bytes and rejects any pre-parser middleware.                              |
| Worker performs AI or queue work inline                  | Meta timeouts and ingress instability                | Worker stores raw event durably, returns `200`, and exits.                                                        |
| Duplicate events create duplicate messages or sends      | Broken transcript and customer spam                  | Event-key dedupe plus unique outbound queue constraints by `messageId` and `idempotencyKey`.                      |
| Freeform outbound bypasses WhatsApp 24-hour rules        | Compliance failure and delivery rejection            | Database-level service-window checks before assistant or agent freeform sends.                                    |
| Prompt injection in user text, RAG, or media transcripts | Bot policy override or leakage risk                  | AI safety pre-processor, suspicious-context quarantine, and guardrail logging.                                    |
| Media download starts too late                           | Expired Meta media URLs and unrecoverable failures   | Dedicated high-priority media jobs with fetch deadline tied to `receivedAt`.                                      |
| RAG embeds raw HTML or low-quality scraped text          | Poor answer quality and unsafe prompt context        | Markdown normalization for every source before chunking and embedding.                                            |
| Tenant data leakage                                      | Severe security breach                               | Tenant-scoped Convex access, RBAC, redaction, and audit logging.                                                  |
| Billing state tied too closely to provider payloads      | Hard-to-reason entitlement bugs                      | Provider-agnostic `subscriptions` table plus raw provider event log.                                              |
| Indonesian market needs under-modeled                    | Product mismatch and onboarding failure              | Bahasa Indonesia support, local payment routing, media-first WhatsApp behavior, and local templates from day one. |

## Phase Exit Condition

Phase 0 is approved. Phase 1 implementation is now allowed to start.
