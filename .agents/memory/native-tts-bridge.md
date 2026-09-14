---
name: Native TTS bridge usage
description: Android Quran Assistant speech must use the registered Capacitor proxy and cancel initialization-time requests on stop
---

Use the shared `NativeTTS` Capacitor proxy for Android text-to-speech rather than reaching into `window.Capacitor.Plugins` directly. The Android plugin may receive `speak` before `TextToSpeech` finishes initializing, so it queues requests; `stop` must clear both queued and active requests.

**Why:** Android WebView does not reliably provide `window.speechSynthesis`, and an uncanceled initialization queue can start stale audio after the user pauses or switches messages.

**How to apply:** Keep browser speech fallback behavior separate, use one native session at a time, and invalidate/cancel the native session before starting another message.