---
name: Google Sheets coin audit
description: Operational caveat for auditing the legacy welcome/referral reward flow against the active Sheets runtime
---

The active Google Sheets runtime is append-only for coin transactions, so historical transaction rows can outnumber current Users rows and contain user IDs that are no longer present in Users. In the audited snapshot, current users still had welcome-bonus rows while many older bonus transactions were orphaned; this must not be interpreted as repeated awards to the same current user.

**Why:** The Sheets data layer does not preserve a one-to-one current-user view of all historical transactions, and the reward audit otherwise overstates active-user activity.

**How to apply:** Join transaction rows to the current Users tab before attributing activity to current users; separately report orphaned historical rows and current-user rows. Treat `new_user_bonus` rows with their timestamps as evidence of registration-time grants, not scheduled background grants.