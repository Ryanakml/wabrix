# WhatsApp Setup

This page is the quick operator guide for connecting one organization to one real WhatsApp phone number.

## What must already exist

- A working Meta app
- A WhatsApp Business Account
- A phone number already attached to that WABA
- A bot profile in Wabrix
- A staging or production ingress URL that points to `/webhooks/whatsapp`

## Values you need

- `phoneNumberId`
- `businessAccountId`
- `accessToken`
- `appSecret`
- `verifyToken`

These values are not interchangeable. `phoneNumberId` is for message send and status mapping. `businessAccountId` is for template and lifecycle sync. `appSecret` is for signature validation. `verifyToken` is only for the webhook challenge handshake.

## Recommended setup order

1. Create or confirm the bot profile first in Bot Studio.
2. Open the WhatsApp setup page inside the correct organization.
3. Save `phoneNumberId`, `businessAccountId`, and all secrets.
4. Copy the webhook URL shown by the app.
5. Paste that webhook URL into Meta and set the same `verifyToken`.
6. Run the lifecycle refresh and template sync once.

## What success looks like

- Integration status is `configured`
- Webhook verification works
- Lifecycle data shows real approval state
- Templates can be synced from Meta
- New inbound messages land in `whatsappWebhookEvents`

## Common mistakes

- Saving credentials before the bot profile exists
- Using the wrong phone number when one WABA owns multiple numbers
- Forgetting to set `NEXT_PUBLIC_INGRESS_URL` in the web environment
- Mixing staging credentials with production webhook URLs
- Expecting secrets to re-render in the UI after save. Wabrix intentionally hides them after save.

## Fast troubleshooting

- If the Meta challenge fails, check `verifyToken` first.
- If POST signatures fail, check `appSecret`.
- If messages do not map into conversations, confirm the incoming payload phone number matches a saved `phoneNumberId`.
- If templates do not appear, confirm `businessAccountId` is correct and the token has the right scope.
