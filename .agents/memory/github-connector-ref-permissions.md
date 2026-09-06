---
name: GitHub connector ref permissions
description: Documents the observed boundary between Git object writes and branch/ref mutation through the configured GitHub connector.
---

The configured GitHub connector can read repositories and create blobs, trees, and commits, but it may not be authorized to create or update branch refs, merge branches, or write workflow files through the Contents API.

**Why:** During the Version 22 release preparation, source commits were created successfully, while REST `PATCH /git/refs`, `POST /git/refs`, GraphQL `updateRef`, merge, Contents `PUT`, and the Git source-control helper were denied or blocked. Dispatching Actions by an unreferenced commit also fails because GitHub requires a branch, tag, or other reachable ref.

**How to apply:** Verify the remote branch SHA after any connector publish. Do not claim an Actions build started until the target commit is reachable from a remote ref. If ref mutation is denied, ask the user to grant GitHub source-control permissions or perform the push, then resume from the already-created commit objects.

Repeated verification on August 11, 2026 showed the local Android-fix commit can remain ahead of `origin/main`; both the Git helper and HTTPS push can fail before updating the ref when Replit's Git askpass/source-control credential is unavailable.

**Why:** A local commit and a configured GitHub URL are not proof that GitHub received the commit; only `git ls-remote origin refs/heads/main` and the GitHub Actions `head_sha` establish reachability.

**How to apply:** Stop before dispatching or reporting artifacts when the remote SHA is still older than the verified local commit.

The Active GitHub Connector is an authenticated API/proxy integration, not automatically a credential provider for the workspace's normal HTTPS Git transport. A plain `origin` URL with no Git credential helper still fails GitHub push authentication.

**Why:** A September 2026 diagnostic showed the connector active while `git push --dry-run` returned GitHub's invalid username/token error; Replit's Git pane repository connection is the separate official Git authentication path.

**How to apply:** Diagnose the Git pane's linked-account/repository connection and its internal Git credential binding before retrying normal Git. Never use the connector's REST API to reconstruct commits when exact SHA preservation matters.