---
name: Admin theme scope
description: Visual styling boundary for the private Admin Panel
---

The private Admin Panel should use Noor Quran’s dark-green hub palette, but its colors must remain scoped to `.admin-shell` and Admin-only classes. Do not change global theme variables or public page styling to restyle Admin.

**Why:** Admin is a separate private surface, while the public app has established light and dark page treatments that must remain stable.

**How to apply:** Update Admin tokens and Admin page hardcoded surfaces only; verify the `/admin` route separately from public routes after visual changes.