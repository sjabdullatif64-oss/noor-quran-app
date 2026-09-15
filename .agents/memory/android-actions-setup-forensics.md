---
name: Android Actions setup forensics
description: Evidence boundaries when comparing successful and failed GitHub-hosted Android workflow runs
---

When a GitHub Actions Android run fails in `android-actions/setup-android`, compare the exact workflow blob at each run’s head commit, job step sequence, runner name, labels, and artifact list before changing YAML. The Jobs API can show the hosted runner identity and labels but may return no runner image or architecture; the connector may also return `403 Forbidden` for raw job logs, so do not invent the missing stderr.

**Why:** A successful run and later failures can use byte-identical `setup-android@v3`, Java 21, SDK 36, build-tools 36.0.0, and `ubuntu-latest` while landing on different hosted runner IDs. If the failure occurs before `sdkmanager` and the workflow diff has no setup-related change, the available evidence supports runner/action infrastructure rather than an application or Gradle defect.

**How to apply:** Treat a new setup failure as a workflow fix only when the historical comparison proves a setup-relevant YAML, permission, or action-reference difference. Otherwise preserve API 36 requirements and report the exact evidence boundary; a rerun is not proof of a fix unless Gradle, APK, AAB, upload, and artifact verification all complete.