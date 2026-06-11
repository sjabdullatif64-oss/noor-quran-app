// Build-time constants injected by CI via VITE_COMMIT_SHA / VITE_BUILD_VERSION.
// Falls back to hardcoded values so the web-preview and local dev also show
// something meaningful.  Update the fallbacks with each release push.
export const BUILD_INFO = {
  version:   import.meta.env.VITE_BUILD_VERSION || "1.0.16",
  commitSha: (import.meta.env.VITE_COMMIT_SHA?.slice(0, 7)) || "787c2f0",
  buildDate: "2026-06-11",
} as const;
