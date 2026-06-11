package com.sj64noorquran;

import android.app.AlarmManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Re-schedules prayer Azan alarms after the device reboots.
 *
 * AlarmManager alarms are cleared on reboot.  This receiver fires on
 * BOOT_COMPLETED / REBOOT and reads the schedule that was persisted
 * by AzanPlugin.savePrayerTimes() before re-arming each future alarm.
 */
public class AzanBootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (!android.content.Intent.ACTION_BOOT_COMPLETED.equals(action)
                && !"android.intent.action.REBOOT".equals(action)
                && !"android.intent.action.QUICKBOOT_POWERON".equals(action)) {
            return;
        }

        SharedPreferences prefs =
            context.getSharedPreferences(AzanPlugin.PREFS_NAME, Context.MODE_PRIVATE);
        String json = prefs.getString("saved_schedule", null);
        if (json == null || json.isEmpty()) return;

        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        // Ensure the notification channel is created before any alarm fires
        AzanPlugin.ensureChannel(context);

        try {
            JSONArray prayers = new JSONArray(json);
            for (int i = 0; i < prayers.length(); i++) {
                JSONObject p = prayers.getJSONObject(i);
                AzanPlugin.rescheduleFromJson(context, am, p);
            }
        } catch (Exception ignored) { /* malformed JSON — skip silently */ }
    }
}
