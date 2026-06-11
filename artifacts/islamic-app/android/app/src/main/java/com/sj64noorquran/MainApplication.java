package com.sj64noorquran;

import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;

public class MainApplication extends Application {

    public static final String NOTIF_CHANNEL_ID   = "noor-islamic";
    public static final String NOTIF_CHANNEL_NAME = "Islamic Reminders";

    // ── Earliest possible hook ────────────────────────────────────────────────

    @Override
    protected void attachBaseContext(Context base) {
        super.attachBaseContext(base);
        crumb(base, "A1_attachBaseContext_done");

        Thread.UncaughtExceptionHandler prev = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler(new CrashHandler(base, prev));
        crumb(base, "A2_crashHandler_installed");
    }

    @Override
    public void onCreate() {
        crumb(this, "A3_app_onCreate_start");

        // ── Check for crash saved from the PREVIOUS launch ────────────────────
        SharedPreferences prefs = getSharedPreferences("noor_debug", MODE_PRIVATE);
        String savedCrash = prefs.getString("crash", null);
        if (savedCrash != null) {
            prefs.edit().remove("crash").apply();
            Intent intent = new Intent(this, CrashActivity.class);
            intent.putExtra("trace", savedCrash);
            intent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_CLEAR_TASK |
                Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS
            );
            startActivity(intent);
            return;
        }

        crumb(this, "A4_super_onCreate_start");
        super.onCreate();
        crumb(this, "A5_super_onCreate_done");

        createNotificationChannel();
        crumb(this, "A6_app_onCreate_done");
    }

    /** Write a startup breadcrumb — tells us exactly how far startup got. */
    static void crumb(Context ctx, String tag) {
        try {
            ctx.getSharedPreferences("noor_debug", Context.MODE_PRIVATE)
               .edit().putString("last_crumb", tag).commit();
            android.util.Log.d("NoorCrash", "CRUMB: " + tag);
        } catch (Throwable ignored) {}
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                NOTIF_CHANNEL_ID,
                NOTIF_CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Prayer times, Quran ayah, and dhikr reminders");
            channel.enableLights(true);
            channel.setLightColor(Color.parseColor("#1a5c38"));
            channel.enableVibration(true);
            channel.setShowBadge(true);

            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }
}
