# Release Plan And Phase Gates

## Environment Strategy

Three environments are required:

- Local
- Staging
- Production

Each environment gets separate deployments and credentials for web, ingress, Convex, auth, observability, billing, and WhatsApp where possible.

## Release Process

1. Implement only one phase at a time.
2. Add or update automated tests for that phase.
3. Update runbooks and setup docs.
4. Run the phase command set and verify expected state.
5. Review the phase Definition of Done.
6. Merge after review.
7. Promote to staging automatically when CI passes.
8. Promote to production only with manual approval and smoke checks.

## CI/CD Expectations

Pull requests must eventually run:

- dependency install
- lint
- typecheck
- tests
- build

Staging must prove:

- web loads
- dashboard loads
- ingress verification works
- signed webhook fixtures behave correctly
- one fake outbound path can complete
- observability receives test events

Production must prove:

- health checks pass
- monitoring is active
- release visibility exists in Sentry and LLM observability
- billing webhook endpoints respond

## Phase Plan

| Phase | Name                                            | Exit Gate                                              |
| ----- | ----------------------------------------------- | ------------------------------------------------------ |
| 0     | Product spec and technical design               | Documents reviewed and accepted                        |
| 1     | New repo foundation                             | Monorepo scaffold builds cleanly                       |
| 2     | Auth, organizations, RBAC                       | Tenant isolation proven                                |
| 3     | Core Bot Studio and AI config                   | Bot draft generation works end to end                  |
| 4     | Knowledge base and RAG                          | Markdown-normalized retrieval works                    |
| 5     | WhatsApp integration config                     | Secrets stored safely and redacted                     |
| 6     | Webhook ingress                                 | Staging webhook verification and signed fixtures pass  |
| 7     | Inbound processor and conversation mapping      | Inbound events create durable internal state           |
| 8     | Bot orchestrator and reply queue                | Replies enqueue safely with service-window enforcement |
| 9     | Outbound sender and status reconciliation       | Meta sends and statuses reconcile idempotently         |
| 10    | Inbox, handoff, and agent tools                 | Human operations are durable and guarded               |
| 11    | Templates, media, and WhatsApp production rules | Compliance and media flows are enforced                |
| 12    | Analytics, billing, and limits                  | Usage and subscription state are reliable              |
| 13    | Landing page, SEO, docs, and growth             | Customer-facing launch surfaces are ready              |
| 14    | CI/CD, monitoring, security hardening           | Operability is production-grade                        |
| 15    | Beta launch and production readiness            | Real-user pilot can run safely                         |

## Formal Phase-0 Approval Checklist

- PRD approved
- Architecture approved
- Data model approved
- Security risks documented and accepted
- Phase gates approved

Until those items are explicitly approved, this repository remains in pre-implementation state.
