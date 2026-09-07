---
name: Beginner course content invariant
description: Durable validation rules for the separate Arabic Reading Basics curriculum
---

The Beginner Arabic Reading course treats each lesson record as a real practice item. Content expansions must validate the generated per-level arrays, not only the progress counter or level labels. The original Arabic Letters Level 1 catalog is a compatibility boundary and should remain unchanged while later levels grow.

**Why:** The course UI derives progress and quick checks from the underlying lesson records, so changing a displayed count without adding records would not give learners more practice.

**How to apply:** Keep curated vowelled Arabic content in the course data layer, assert actual lesson counts in the course test, and keep AI Teacher curriculum data separate.