package com.sj64noorquran;

import android.app.Notification;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;

import java.util.HashMap;
import java.util.Map;

/**
 * Foreground service that plays the Azan audio at prayer time.
 *
 * Audio is played from LOCAL bundled files in res/raw only — no network
 * streaming. This guarantees playback works fully offline, with the app
 * closed, and with the screen locked (previous versions streamed the audio
 * from an external URL that went permanently offline, so no sound ever
 * played even though the notification appeared correctly).
 *
 * Lifecycle:
 *   1. AzanReceiver starts this service via startForegroundService().
 *   2. We immediately call startForeground() with a prayer notification.
 *   3. We request audio focus (so any other playing audio ducks/stops)
 *      and play the selected local Azan audio file.
 *   4. When audio completes (or on error) we release focus and stopSelf().
 *   5. A "Stop Azan" action in the notification sends a STOP_AZAN intent.
 */
public class AzanService extends Service {

    private static final int NOTIFICATION_ID = 7001;
    static final String ACTION_STOP = "com.sj64noorquran.STOP_AZAN";

    // Local bundled Azan audio — the only playback source (no streaming).
    private static final Map<String, Integer> AZAN_RAW = new HashMap<>();
    static {
        AZAN_RAW.put("default",  R.raw.azan_default);
        AZAN_RAW.put("makkah",   R.raw.azan_makkah);
        AZAN_RAW.put("madinah",  R.raw.azan_madinah);
        AZAN_RAW.put("mishary",  R.raw.azan_mishary);
    }

    private MediaPlayer            mediaPlayer;
    private PowerManager.WakeLock  wakeLock;
    private AudioManager           audioManager;
    private AudioFocusRequest      audioFocusRequest; // API 26+
    private AudioManager.OnAudioFocusChangeListener focusListener = change -> { /* no-op: alarm plays through */ };

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
        requestAudioFocus();

        Integer resId = AZAN_RAW.containsKey(soundKey) ? AZAN_RAW.get(soundKey) : AZAN_RAW.get("default");
        if (resId == null) resId = R.raw.azan_short; // absolute last-resort local asset

        if (!tryPlay(resId) && resId != R.raw.azan_short) {
            // Bundled reciter file failed to load for some reason — fall back to
            // the guaranteed-present short local tone so something always plays.
            tryPlay(R.raw.azan_short);
        }
    }

    /** Attempts to play a local raw resource. Returns true if playback started. */
    private boolean tryPlay(int resId) {
        try {
            mediaPlayer = MediaPlayer.create(this, resId);
            if (mediaPlayer == null) return false;

            mediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .setUsage(AudioAttributes.USAGE_ALARM)
                .build());
            mediaPlayer.setOnCompletionListener(mp -> stopSelf());
            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                stopSelf();
                return true;
            });
            mediaPlayer.start();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private void requestAudioFocus() {
        audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);
        if (audioManager == null) return;

        AudioAttributes attrs = new AudioAttributes.Builder()
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .setUsage(AudioAttributes.USAGE_ALARM)
            .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
                .setAudioAttributes(attrs)
                .setOnAudioFocusChangeListener(focusListener)
                .build();
            try { audioManager.requestAudioFocus(audioFocusRequest); } catch (Exception ignored) { /* */ }
        } else {
            try {
                audioManager.requestAudioFocus(
                    focusListener, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE);
            } catch (Exception ignored) { /* */ }
        }
    }

    private void abandonAudioFocus() {
        if (audioManager == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                audioManager.abandonAudioFocusRequest(audioFocusRequest);
            } else {
                audioManager.abandonAudioFocus(focusListener);
            }
        } catch (Exception ignored) { /* */ }
    }

    private void stopMedia() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) mediaPlayer.stop();
                mediaPlayer.release();
            } catch (Exception ignored) { /* */ }
            mediaPlayer = null;
        }
        abandonAudioFocus();
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
        if (sound == null) return "Default Adhan";
        switch (sound) {
            case "makkah":  return "Makkah Azan";
            case "madinah": return "Traditional Azan";
            case "mishary": return "Community Azan";
            default:        return "Default Adhan";
        }
    }
}
