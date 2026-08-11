---
name: GitHub connector ref permissions
description: Documents the observed boundary between Git object writes and branch/ref mutation through the configured GitHub connector.
---

The configured GitHub connector can read repositories and create blobs, trees, and commits, but it may not be authorized to create or update branch refs, merge branches, or write workflow files through the Contents API.

**Why:** During the Version 22 release preparation, source commits were created successfully, while REST `PATCH /git/refs`, `POST /git/refs`, GraphQL `updateRef`, merge, Contents `PUT`, and the Git source-control helper were denied or blocked. Dispatching Actions by an unreferenced commit also fails because GitHub requires a branch, tag, or other reachable ref.

**How to apply:** Verify the remote branch SHA after any connector publish. Do not claim an Actions build started until the target commit is reachable from a remote ref. If ref mutation is denied, ask the user to grant GitHub source-control permissions or perform the push, then resume from the already-created commit objects.