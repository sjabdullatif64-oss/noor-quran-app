---
name: AdMob safe init pattern for Capacitor Android
description: How to re-enable AdMob without the MobileAdsInitProvider crash while preserving WorkManager
---

## Rule
Do NOT use `tools:node="remove"` on the full `androidx.startup.InitializationProvider` — it removes ALL AndroidX Startup components including WorkManager.

Instead, use `tools:node="merge"` on the provider with a nested `<meta-data>` that removes only `MobileAdsInitProvider`:

```xml
<provider
    android:name="androidx.startup.InitializationProvider"
    android:authorities="${applicationId}.androidx-startup"
    android:exported="false"
    tools:node="merge">
    <meta-data
        android:name="com.google.android.gms.ads.MobileAdsInitProvider"
        tools:node="remove" />
</provider>
```

**Why:** `MobileAdsInitProvider` crashes on startup if AdMob is not initialized before the ContentProvider runs. Removing it from auto-init and calling `AdMob.initialize()` in native-init.ts gives controlled initialization timing.

**How to apply:** Use this pattern whenever AdMob is added/re-enabled in any Capacitor Android project.
