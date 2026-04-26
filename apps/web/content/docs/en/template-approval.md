# Template Approval

Templates are the safe fallback when the 24-hour service window is closed.

## What the operator should know

- Templates must exist in Meta, not only locally
- Template status can be `approved`, `pending`, `rejected`, or archived
- A rejected template needs content changes, not just another sync

## Recommended flow

1. Create or sync templates from the WhatsApp setup page.
2. Wait for Meta approval.
3. Use approved templates from the inbox when freeform replies are blocked.
4. Monitor rejection reason text if Meta rejects the template.

## How this connects to the inbox

When the service window is closed:

- manual freeform reply should be blocked
- approved template reply should still be available
- the queue payload should be `template`, not `text`

## Common rejection causes

- vague or misleading message copy
- variables without clear purpose
- content that feels promotional but is framed as utility
- message body that does not match the declared category

## Operator checklist

- Is the template synced into Wabrix?
- Is the language code correct?
- Is the status `approved`?
- Is the category still valid for the use case?
- Does the inbox fallback select the right template?

## Debug mindset

If a template exists locally but cannot be sent, check status synchronization first. If the template is approved in Meta but missing in Wabrix, run template sync again before touching queue code.
