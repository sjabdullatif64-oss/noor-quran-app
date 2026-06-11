package com.sj64noorquran;

import android.app.Notification;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * Foreground service that plays the Azan audio at prayer time.
 *
 * Lifecycle:
 *   1. AzanReceiver starts this service via startForegroundService().
 *   2. We immediately call startForeground() with a prayer notification.
 *   3. MediaPlayer streams the Azan audio.
 *   4. When audio completes (or on error) we call stopSelf().
 *   5. A "Stop Azan" action in the notification sends a STOP_AZAN intent.
 */
public class AzanService extends Service {

    private static final int NOTIFICATION_ID = 7001;
    static final String ACTION_STOP = "com.sj64noorquran.STOP_AZAN";

    // Full-Azan streaming URLs — tried in order; fallback handled gracefully
    private static final Map<String, String> AZAN_URLS = new HashMap<>();
    static {
        AZAN_URLS.put("default",  "https://www.islamicfinder.us/islamicplayer/azan/adhan_hussary.mp3");
        AZAN_URLS.put("makkah",   "https://www.islamicfinder.us/islamicplayer/azan/adhan_makkah.mp3");
        AZAN_URLS.put("madinah",  "https://www.islamicfinder.us/islamicplayer/azan/adhan_madinah.mp3");
        AZAN_URLS.put("mishary",  "https://www.islamicfinder.us/islamicplayer/azan/adhan_mishary.mp3");
    }

    private MediaPlayer           mediaPlayer;
    private PowerManager.WakeLock wakeLock;

    // ── Service lifecycle ────────────────────────────────────────────────────

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Handle explicit stop from notification action
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String prayerName = intent != null ? intent.getStringExtra("prayer_name") : null;
        String sound      = intent != null ? intent.getStringExtra("prayer_sound") : null;
        if (prayerName == null) prayerName = "Prayer";
        if (sound      == null) sound      = "default";

        // Acquire CPU wake lock so the audio continues with screen off
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK, "NoorQuran::AzanWakeLock");
            wakeLock.acquire(15 * 60 * 1000L); // max 15 min safety cap
        }

        // Must call startForeground() immediately (< 5 s after startForegroundService)
        startForeground(NOTIFICATION_ID, buildNotification(prayerName, sound));

        playAzan(sound);
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        stopMedia();
        releaseWakeLock();
    }

    // ── Audio playback ───────────────────────────────────────────────────────

    private void playAzan(String soundKey) {
        stopMedia();
        String url = AZAN_URLS.containsKey(soundKey)
            ? AZAN_URLS.get(soundKey)
            : AZAN_URLS.get("default");
        if (url == null) { stopSelf(); return; }

        try {
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .setUsage(AudioAttributes.USAGE_ALARM)
                .build());
            mediaPlayer.setDataSource(url);
            mediaPlayer.setOnPreparedListener(MediaPlayer::start);
            mediaPlayer.setOnCompletionListener(mp -> stopSelf());
            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                stopSelf();
                return true;
            });
            mediaPlayer.prepareAsync();
        } catch (IOException | IllegalArgumentException | IllegalStateException e) {
            stopSelf();
        }
    }

    private void stopMedia() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) mediaPlayer.stop();
                mediaPlayer.release();
            } catch (Exception ignored) { /* */ }
            mediaPlayer = null;
        }
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            try { wakeLock.release(); } catch (Exception ignored) { /* */ }
        }
        wakeLock = null;
    }

    // ── Notification ─────────────────────────────────────────────────────────

    private Notification buildNotification(String prayerName, String sound) {
        // Tap notification → open app
        Intent openApp = new Intent(this, MainActivity.class);
        openApp.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openPi = PendingIntent.getActivity(this, 0, openApp,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // "Stop Azan" action
        Intent stopIntent = new Intent(this, AzanService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPi = PendingIntent.getService(this, 1, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        int iconRes = getResources().getIdentifier(
            "ic_stat_noor", "drawable", getPackageName());
        if (iconRes == 0) iconRes = android.R.drawable.ic_popup_reminder;

        String emoji = getPrayerEmoji(prayerName);
        String soundLabel = getSoundLabel(sound);

        return new NotificationCompat.Builder(this, AzanPlugin.CHANNEL_ID)
            .setSmallIcon(iconRes)
            .setContentTitle(emoji + " " + prayerName + " — Azan")
            .setContentText("Prayer time has begun · " + soundLabel + " · Tap to open Noor Quran")
            .setSubText("Noor Quran")
            .setContentIntent(openPi)
            .addAction(android.R.drawable.ic_media_pause, "Stop Azan", stopPi)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setColor(0xFF1a5c38)
            .build();
    }

    private static String getPrayerEmoji(String name) {
        if (name == null) return "🕌";
        switch (name.toLowerCase()) {
            case "fajr":    return "🌙";
            case "dhuhr":   return "☀️";
            case "asr":     return "🌤️";
            case "maghrib": return "🌅";
            case "isha":    return "🌙";
            default:        return "🕌";
        }
    }

    private static String getSoundLabel(String sound) {
        if (sound == null) return "Hussary";
        switch (sound) {
            case "makkah":  return "Makkah";
            case "madinah": return "Madinah";
            case "mishary": return "Mishary";
            default:        return "Hussary";
        }
    }
}
