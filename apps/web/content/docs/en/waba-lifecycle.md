# WABA Lifecycle

The WABA lifecycle is the real health story of a WhatsApp number. It is not just one status.

## The states that matter

- Approval state: whether Meta has approved core business setup
- Phone verification state: whether the number is ready for trusted messaging
- Display name review: whether the chosen sender name passes review
- Messaging tier: how much daily volume Meta currently allows
- Current blockers: anything preventing reliable launch

## How to read it operationally

- If approval is incomplete, do not treat the number as production-ready.
- If display name review is pending or rejected, keep expectations low for rollout timing.
- If phone verification is incomplete, fix that before debugging message delivery.
- If blockers exist, solve blockers before tweaking bot logic.

## Wabrix behavior

Wabrix stores lifecycle snapshots so operators can see state from the dashboard instead of cross-checking Meta manually every time. This matters because onboarding, template approval, and outbound eligibility are deeply related.

## Good operator habit

Refresh lifecycle after:

- first integration setup
- OTP verification
- template review changes
- any Meta-side business change
- before promoting staging configuration into production

## Anti-patterns

- Treating `configured` as equal to `fully approved`
- Ignoring messaging tier until outbound traffic starts failing
- Letting rejected display names sit unresolved

## Escalation rule

If lifecycle blockers remain after credentials, verification, and sync all look correct, stop changing product code. The issue is probably on the Meta account side, not in app logic.
