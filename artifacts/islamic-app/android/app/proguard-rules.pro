# ── Annotation metadata — MUST be first ──────────────────────────────────────
# Without these, R8 strips @CapacitorPlugin / @PluginMethod / @JavascriptInterface
# annotations from class files at runtime.  Capacitor 8's Bridge calls
# pluginClass.getAnnotation(CapacitorPlugin.class) — if that returns null it
# throws NullPointerException inside BridgeActivity.onCreate() and the app
# crashes immediately on every launch.
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod
-keepattributes Exceptions

# ── Capacitor core ────────────────────────────────────────────────────────────
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }

# Keep all @PluginMethod methods — Capacitor bridge calls them by name via
# reflection; R8 would rename or remove them without this rule.
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.PluginMethod <methods>;
}

# ── Noor Quran main activity + application ────────────────────────────────────
-keep class com.sj64noorquran.** { *; }

# ── AdMob / Google Mobile Ads ─────────────────────────────────────────────────
-keep class com.getcapacitor.community.admob.** { *; }
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.android.gms.common.** { *; }
-keep class com.google.android.ump.** { *; }
-dontwarn com.google.android.gms.ads.**
-dontwarn com.google.android.ump.**
-keep class com.google.android.gms.ads.identifier.** { *; }
-keep class com.google.android.gms.ads.mediation.** { *; }

# ── JavaScript interface ──────────────────────────────────────────────────────
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ── AndroidX ──────────────────────────────────────────────────────────────────
-keep class androidx.** { *; }
-keep interface androidx.** { *; }

# ── Kotlin ────────────────────────────────────────────────────────────────────
-keep class kotlin.** { *; }
-keepclassmembers class **$WhenMappings { <fields>; }
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# ── OkHttp / networking ───────────────────────────────────────────────────────
-dontwarn okhttp3.**
-dontwarn okio.**

# ── Optional / unused dependencies ───────────────────────────────────────────
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
