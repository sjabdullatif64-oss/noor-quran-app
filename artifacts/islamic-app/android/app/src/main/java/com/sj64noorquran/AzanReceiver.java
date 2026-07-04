package com.sj64noorquran;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/**
 * Fires when an AlarmManager exact alarm triggers for a prayer time.
 * Starts AzanService as a foreground service to play the Azan audio.
 */
public class AzanReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;

        int    prayerId   = intent.getIntExtra("prayer_id",    1000);
        String prayerName = intent.getStringExtra("prayer_name");
        String sound      = intent.getStringExtra("prayer_sound");
        if (prayerName == null) prayerName = "Prayer";
        if (sound      == null) sound      = "default";

        AzanDiagnostics.log(context, "RECEIVER_FIRED id=" + prayerId
            + " name=" + prayerName + " sound=" + sound
            + " sdk=" + Build.VERSION.SDK_INT);

        // Ensure the notification channel exists before the service tries to show
        AzanPlugin.ensureChannel(context);

        Intent serviceIntent = new Intent(context, AzanService.class);
        serviceIntent.putExtra("prayer_id",    prayerId);
        serviceIntent.putExtra("prayer_name",  prayerName);
        serviceIntent.putExtra("prayer_sound", sound);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            AzanDiagnostics.log(context, "START_SERVICE_CALL_OK");
        } catch (Throwable t) {
            AzanDiagnostics.log(context, "START_SERVICE_CALL_FAILED: " + t);
        }
    }
}
