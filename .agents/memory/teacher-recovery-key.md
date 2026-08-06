---
name: AI Teacher Recovery Key
description: Durable design constraints for restoring Noor AI Teacher accounts across app-data loss and reinstalls
---

The AI Teacher Recovery Key is a server-owned identity, not a local-storage identifier. Recovery keys are HMAC-indexed for lookup and encrypted for display/snapshot storage; Teacher snapshots include the complete `noor-teacher-*` namespace so future Teacher data is recoverable without another schema change.

**Why:** Clearing app data removes localStorage, so local-only progress and randomly generated browser IDs cannot restore an account. Android's native device identifier provides automatic same-device reconnection after reinstall, while the displayed key supports manual restore on any device.

**How to apply:** Keep account creation idempotent per server user and serialize creation checks so concurrent registration cannot create duplicate Teacher accounts. When restoring, replace the entire local Teacher namespace rather than merging stale local keys, and keep the lesson/speech engine offline-first.