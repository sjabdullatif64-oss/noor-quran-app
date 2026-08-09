---
name: AI Teacher microphone lifecycle
description: Durable constraints for native and Web Speech recognition start/stop behavior
---

The Teacher microphone uses one cancellable recognition session at a time. Starting must call the recognizer immediately; the maximum duration is only a timeout. Stopping must cancel the session, timeout, retry delay, and page-side async run before any callback can update UI or score.

**Why:** Native Android recognition can resolve listeners and callbacks out of order, especially while its service is starting or stopping. Without a session identity, an old timeout or end event can restart recognition or mutate a newer attempt.

**How to apply:** Keep the recognizer wrapper responsible for exactly-once settlement and native stop. Pass an AbortSignal through bounded retries, guard all page-side awaits with the current run identity, and ignore aborted results rather than assessing them.