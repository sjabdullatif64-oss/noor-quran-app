---
name: Capacitor plugin thenable trap
description: Registered Capacitor plugin proxies must not be returned from async helpers because Promise resolution probes an unsupported then property
---

Never return a registered Capacitor plugin proxy from an `async` helper or pass the proxy through `await`; JavaScript Promise assimilation probes `.then`, and some Capacitor Android proxies expose an unsupported `then` method. Keep plugin acquisition synchronous and await only the documented plugin method calls.

**Why:** Android SpeechRecognition failed before `checkPermissions()` because an async plugin getter caused the Capacitor proxy to be assimilated as a Promise, producing `"SpeechRecognition.then()" is not implemented on android`.

**How to apply:** For Capacitor plugins, use a synchronous getter for the registered proxy. Call documented methods such as `checkPermissions()`, `requestPermissions()`, `start()`, and `stop()` directly and await those returned Promises.