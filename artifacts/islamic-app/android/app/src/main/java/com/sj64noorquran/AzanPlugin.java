package com.sj64noorquran;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;

@CapacitorPlugin(name = "Azan")
public class AzanPlugin extends Plugin {

    static final String CHANNEL_ID   = "noor-azan";
    static final String PREFS_NAME   = "noor-azan-prefs";
    static final String ACTION_AZAN  = "com.sj64noorquran.AZAN_TRIGGER";
    static final int    ID_MIN       = 1000;
    static final int    ID_MAX       = 1019; // 20 slots: 10 prayers × 2 days

    // ── Notification channel ─────────────────────────────────────────────────

    static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager)
            ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null || nm.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel ch = new NotificationChannel(
            CHANNEL_ID, "Azan — Prayer Time", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Plays the Azan when prayer time begins");
        ch.enableVibration(true);
        ch.setVibrationPattern(new long[]{0, 400, 200, 400, 200, 400});
        ch.enableLights(true);
        ch.setLightColor(0xFF1a5c38);
        nm.createNotificationChannel(ch);
    }

    @Override
    public void load() {
        ensureChannel(getContext());
    }

    // ── Plugin methods ───────────────────────────────────────────────────────

    /**
     * Schedule an exact alarm for one prayer.
     * JS: Azan.schedulePrayer({ id, name, timestamp, sound })
     *   id        – int  (1000–1019)
     *   name      – string ("Fajr", "Dhuhr", …)
     *   timestamp – long  (Unix ms, obtained via getData().getLong for safety)
     *   sound     – string ("default" | "makkah" | "madinah" | "mishary")
     */
    @PluginMethod
    public void schedulePrayer(PluginCall call) {
        int    id        = call.getInt("id", -1);
        String name      = call.getString("name", "Prayer");
        String sound     = call.getString("sound", "default");
        long   timestamp;
        try {
            timestamp = call.getData().getLong("timestamp");
        } catch (Exception e) {
            call.reject("Invalid or missing timestamp");
            return;
        }
        if (id < ID_MIN || id > ID_MAX) { call.reject("id out of range 1000-1019"); return; }
        if (timestamp <= 0)             { call.reject("timestamp must be > 0"); return; }

        Context      ctx = getContext();
        AlarmManager am  = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) { call.reject("AlarmManager unavailable"); return; }

        // Persist metadata so AzanReceiver / AzanBootReceiver can reconstruct intent
        ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
            .putString("name_" + id,  name)
            .putString("sound_" + id, sound)
            .apply();

        PendingIntent pi = buildAlarmPi(ctx, id, name, sound);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (am.canScheduleExactAlarms()) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pi);
                } else {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pi);
                }
            } else {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pi);
            }
            JSObject ret = new JSObject();
            ret.put("scheduled", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Alarm scheduling failed: " + e.getMessage());
        }
    }

    /** Cancel a specific prayer alarm. */
    @PluginMethod
    public void cancelPrayer(PluginCall call) {
        int id = call.getInt("id", -1);
        if (id < 0) { call.reject("Invalid id"); return; }
        cancelAlarm(getContext(), id);
        call.resolve();
    }

    /** Cancel all prayer alarms (IDs 1000–1019). */
    @PluginMethod
    public void cancelAll(PluginCall call) {
        Context ctx = getContext();
        for (int id = ID_MIN; id <= ID_MAX; id++) cancelAlarm(ctx, id);
        call.resolve();
    }

    /**
     * Returns { notificationGranted: bool, canScheduleExact: bool }
     */
    @PluginMethod
    public void checkPermissions(PluginCall call) {
        Context  ctx = getContext();
        JSObject ret = new JSObject();
        ret.put("notificationGranted",
            NotificationManagerCompat.from(ctx).areNotificationsEnabled());
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            ret.put("canScheduleExact", am != null && am.canScheduleExactAlarms());
        } else {
            ret.put("canScheduleExact", true);
        }

        PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
        ret.put("batteryOptimizationsIgnored", pm != null && pm.isIgnoringBatteryOptimizations());
        
        call.resolve(ret);
    }

    /** Open battery optimization settings. */
    @PluginMethod
    public void requestBatteryOptimizationExemption(PluginCall call) {
        Context ctx = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + ctx.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(intent);
        }
        call.resolve();
    }

    /** Open Android 12+ exact-alarm settings screen. */
    @PluginMethod
    public void openAlarmSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Intent i = new Intent(
                Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        }
        call.resolve();
    }

    /**
     * Persist entire schedule JSON to SharedPreferences for boot-time recovery.
     * JS: Azan.savePrayerTimes({ prayers: [{ id, name, timestamp, sound }] })
     */
    @PluginMethod
    public void savePrayerTimes(PluginCall call) {
        try {
            JSArray prayers = call.getArray("prayers");
            if (prayers == null) { call.reject("Missing prayers array"); return; }
            getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
                .putString("saved_schedule", prayers.toString())
                .apply();
            call.resolve();
        } catch (Exception e) {
            call.reject("savePrayerTimes failed: " + e.getMessage());
        }
    }

    // ── Static helpers (used by AzanBootReceiver) ────────────────────────────

    static PendingIntent buildAlarmPi(Context ctx, int id, String name, String sound) {
        Intent i = new Intent(ctx, AzanReceiver.class);
        i.setAction(ACTION_AZAN);
        i.putExtra("prayer_id",    id);
        i.putExtra("prayer_name",  name);
        i.putExtra("prayer_sound", sound != null ? sound : "default");
        return PendingIntent.getBroadcast(ctx, id, i,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void cancelAlarm(Context ctx, int id) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        Intent i = new Intent(ctx, AzanReceiver.class);
        i.setAction(ACTION_AZAN);
        PendingIntent pi = PendingIntent.getBroadcast(ctx, id, i,
            PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
        if (pi != null) am.cancel(pi);
    }

    /** Reschedule one prayer from a JSONObject; used by AzanBootReceiver. */
    static void rescheduleFromJson(Context ctx, AlarmManager am, JSONObject p) {
        try {
            int    id        = p.getInt("id");
            String name      = p.optString("name",  "Prayer");
            long   timestamp = p.getLong("timestamp");
            String sound     = p.optString("sound", "default");
            if (timestamp <= System.currentTimeMillis()) return; // already past
            PendingIntent pi = buildAlarmPi(ctx, id, name, sound);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (am.canScheduleExactAlarms()) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pi);
                } else {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pi);
                }
            } else {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pi);
            }
        } catch (Exception ignored) { /* skip malformed entries */ }
    }
}
