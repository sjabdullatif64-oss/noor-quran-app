package com.sj64noorquran;

import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;

public class MainApplication extends Application {

    public static final String NOTIF_CHANNEL_ID   = "noor-islamic";
    public static final String NOTIF_CHANNEL_NAME = "Islamic Reminders";

    /** SharedPreferences file used by diagnostic tools. */
    public static final String PREF_DIAG    = "noor_diag";
    /** Key holding the startup log from the most recent crashed launch. */
    public static final String KEY_PREV_LOG = "prev_log";

    @Override
    protected void attachBaseContext(Context base) {
        // ── STEP 0: init StartupLog ──────────────────────────────────────────
        // Must be the very first thing — before super — so every subsequent
        // step can be written.  Uses raw FileOutputStream, no Android APIs.
        try {
            StartupLog.init(base.getFilesDir().getAbsolutePath());
        } catch (Throwable ignored) {}

        // ── STEP 1: save previous-launch log if it crashed ──────────────────
        // hadCrash() is true when startup.log exists but has no LAUNCH_OK.
        // We save it to SharedPreferences NOW so it survives this launch
        // even if we crash again before MainActivity starts.
        try {
            if (StartupLog.hadCrash()) {
                String prev = StartupLog.read();
                if (prev != null) {
                    base.getSharedPreferences(PREF_DIAG, Context.MODE_PRIVATE)
                        .edit()
                        .putString(KEY_PREV_LOG, prev)
                        .commit();            // synchronous — process may die any moment
                }
            }
            StartupLog.reset();               // fresh log for this launch
        } catch (Throwable ignored) {}

        StartupLog.step("ATTACH_BASE_CONTEXT_START");
        super.attachBaseContext(base);
        StartupLog.step("ATTACH_BASE_CONTEXT_DONE");

        // ── STEP 2: install crash handler ────────────────────────────────────
        Thread.UncaughtExceptionHandler prev =
            Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler(new CrashHandler(base, prev));
        StartupLog.step("CRASH_HANDLER_INSTALLED");
    }

    @Override
    public void onCreate() {
        StartupLog.step("APP_ON_CREATE_START");
        super.onCreate();
        StartupLog.step("APP_ON_CREATE_SUPER_DONE");

        createNotificationChannel();
        StartupLog.step("NOTIF_CHANNEL_DONE");
    }

    /** Compatibility alias so existing call-sites compile unchanged. */
    static void crumb(Context ctx, String tag) {
        StartupLog.step(tag);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                NOTIF_CHANNEL_ID, NOTIF_CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Prayer times, Quran ayah, and dhikr reminders");
            ch.enableLights(true);
            ch.setLightColor(Color.parseColor("#1a5c38"));
            ch.enableVibration(true);
            ch.setShowBadge(true);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(ch);
        }
    }
}
