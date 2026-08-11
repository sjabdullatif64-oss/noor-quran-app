---
name: Google Sheets coin audit
description: Operational caveat for auditing the active coin ledger against Google Sheets history
---

The active Google Sheets runtime is append-only for coin transactions, so historical transaction rows can outnumber current Users rows and contain user IDs that are no longer present in Users. Existing Users rows also retain two historical columns after the active user fields; coin and device updates must preserve their positions and values without treating them as runtime data.

**Why:** The Sheets data layer does not preserve a one-to-one current-user view of all historical transactions, and rewriting the established Users layout could shift or overwrite historical data.

**How to apply:** Join transaction rows to the current Users tab before attributing activity to current users; separately report orphaned historical rows and current-user rows. Keep active ayah/check-in rewards and marketplace promotion spending separate from historical ledger records.