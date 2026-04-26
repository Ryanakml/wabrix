# Service-Window Rules

The 24-hour customer care window is one of the most important compliance rules in the product.

## The simple rule

If the customer sent a message within the last 24 hours, Wabrix can send a freeform reply. If not, Wabrix must fall back to an approved template.

## What Wabrix tracks

- `lastInboundAt`
- `serviceWindowExpiresAt`
- bot pause state
- handoff state
- opt-out state

These fields decide whether automation can reply, whether a human can send freeform text, and when the UI must push template fallback instead.

## Product behavior

- Open window: bot and manual freeform reply can continue if no other guard blocks them
- Expiring soon: dashboard should warn the operator
- Closed window: freeform is blocked and template fallback is the safe path

## Why this matters

Without this rule, the product could send policy-breaking messages even if the UI looks correct. That is why backend rechecks the service window right before outbound send.

## Common mistakes

- assuming the UI warning alone is enough
- forgetting that retries also need a final service-window check
- sending manual replies from a closed conversation and thinking the only issue is status, not policy

## Practical operator rule

If a customer comes back after silence, the next inbound message re-opens the window. Until that inbound message exists, stay on approved templates.
