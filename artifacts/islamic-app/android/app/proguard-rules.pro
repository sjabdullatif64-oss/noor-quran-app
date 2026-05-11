# Capacitor
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }

# Noor Quran main activity
-keep class com.sj64noorquran.** { *; }

# JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# AndroidX
-keep class androidx.** { *; }
-keep interface androidx.** { *; }

# Kotlin
-keep class kotlin.** { *; }

# OkHttp (used internally by some Capacitor plugins)
-dontwarn okhttp3.**
-dontwarn okio.**

# Suppress warnings for optional dependencies
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
