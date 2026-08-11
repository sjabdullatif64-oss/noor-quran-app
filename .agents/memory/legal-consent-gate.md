---
name: Legal consent gate
description: Durable behavior for first-launch Terms and Privacy consent in Noor Quran
---

The first-launch legal consent gate wraps the main app shell and app-side initializers, but leaves the existing Terms of Service and Privacy Policy routes reachable before acceptance so users can review them. Consent is local and tied to an explicit policy version; a material legal update must change that version to require consent again.

**Why:** The app has no account-based consent identity, and users must be able to read the existing legal pages before agreeing without creating a second legal-page system.

**How to apply:** Keep the gate as the only consent implementation, use the existing i18n context for gate copy, persist defensively in local storage, and update the consent version whenever either legal policy materially changes. Do not build Android artifacts as part of consent changes unless explicitly requested.