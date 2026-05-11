# Capacitor core
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }

# Noor Quran main activity + application
-keep class com.sj64noorquran.** { *; }

# AdMob / Google Mobile Ads
-keep class com.getcapacitor.community.admob.** { *; }
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.android.gms.common.** { *; }
-keep class com.google.android.ump.** { *; }
-dontwarn com.google.android.gms.ads.**
-dontwarn com.google.android.ump.**
# Keep ad identifier classes
-keep class com.google.android.gms.ads.identifier.** { *; }
-keep class com.google.android.gms.ads.mediation.** { *; }

# JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# AndroidX
-keep class androidx.** { *; }
-keep interface androidx.** { *; }

# Kotlin
-keep class kotlin.** { *; }
-keepclassmembers class **$WhenMappings { <fields>; }

# OkHttp (used internally by some Capacitor plugins)
-dontwarn okhttp3.**
-dontwarn okio.**

# Suppress warnings for optional dependencies
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
