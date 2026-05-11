package com.sj64noorquran;

import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.graphics.Color;
import android.os.Build;
import com.getcapacitor.BridgeActivity;

/**
 * Application class — creates the notification channel on Android 8+ at startup
 * so notifications can be delivered before the user opens the app.
 */
public class MainApplication extends Application {

    public static final String NOTIF_CHANNEL_ID   = "noor-islamic";
    public static final String NOTIF_CHANNEL_NAME = "Islamic Reminders";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
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
