---
name: Quran Assistant Explain this Ayah action
description: The selected-Ayah explanation action is a single guarded request whose completed state removes the repeat action
---

The Quran Assistant's selected-Ayah Explain action must submit the exact selected context and question once, block duplicate in-flight taps, and hide the repeat action after a successful matching response. Audio on the response remains TTS only.

**Why:** Leaving the action visible after the response made the UI look pending and allowed users to mistake playback or the context card for a second submission.

**How to apply:** Keep the selected context attached to the user message so persisted chat history can identify the matching completed response; do not route the response Audio control through the request path.