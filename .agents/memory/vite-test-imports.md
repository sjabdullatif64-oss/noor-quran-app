---
name: Vite browser-only test imports
description: Constraint for running focused TypeScript tests directly under Node or tsx
---

Standalone Node/tsx tests must not import modules that evaluate Vite-only browser globals such as `import.meta.env` at module load time. Keep focused tests limited to browser-independent modules, or provide an explicit Vite-aware test harness.

**Why:** Node does not provide Vite's `import.meta.env`, so an otherwise valid focused test can fail before reaching the assertions.

**How to apply:** When adding direct `tsx` regression tests, import types with `import type` and avoid runtime imports from modules that pull in browser-only configuration or application data layers.