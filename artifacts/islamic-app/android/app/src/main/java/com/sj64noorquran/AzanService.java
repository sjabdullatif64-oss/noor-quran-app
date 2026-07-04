package com.sj64noorquran;

import android.app.Notification;
import android.app.PendingIntent;
import android.app.Service;
import android.content.res.AssetFileDescriptor;
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

        AzanDiagnostics.log(this, "SERVICE_ON_START_COMMAND name=" + prayerName + " sound=" + sound);

        // Acquire CPU wake lock so the audio continues with screen off
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK, "NoorQuran::AzanWakeLock");
            wakeLock.acquire(15 * 60 * 1000L); // max 15 min safety cap
            AzanDiagnostics.log(this, "WAKE_LOCK_ACQUIRED");
        } else {
            AzanDiagnostics.log(this, "WAKE_LOCK_UNAVAILABLE (PowerManager null)");
        }

        // Must call startForeground() immediately (< 5 s after startForegroundService)
        try {
            startForeground(NOTIFICATION_ID, buildNotification(prayerName, sound));
            AzanDiagnostics.log(this, "START_FOREGROUND_OK");
        } catch (Throwable t) {
            AzanDiagnostics.log(this, "START_FOREGROUND_FAILED: " + t);
        }

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

        AzanDiagnostics.log(this, "RESOLVED_RAW_RES_ID=" + resId + " for soundKey=" + soundKey);

        if (!tryPlay(resId) && resId != R.raw.azan_short) {
            // Bundled reciter file failed to load for some reason — fall back to
            // the guaranteed-present short local tone so something always plays.
            AzanDiagnostics.log(this, "PRIMARY_TRACK_FAILED — falling back to azan_short");
            tryPlay(R.raw.azan_short);
        }
    }

    /**
     * Attempts to play a local raw resource. Returns true if playback started.
     *
     * IMPORTANT: we build the MediaPlayer manually (new MediaPlayer() +
     * setDataSource() + prepare()) instead of the MediaPlayer.create(...)
     * convenience method, and we call setAudioAttributes() BEFORE prepare().
     *
     * MediaPlayer.create() internally calls prepare() using the player's
     * default audio attributes (routed to the Music/Media stream) before we
     * ever get a chance to call setAudioAttributes(). Changing the attributes
     * afterwards does not reliably re-route an already-prepared player on all
     * OEM Android builds, so the Azan was actually playing on the phone's
     * Media volume — which is very often muted, turned down, or silenced by
     * Do Not Disturb — instead of the Alarm volume. This is why the
     * notification always appeared on time (a separate code path) while the
     * audio was inaudible. Setting USAGE_ALARM before prepare() ensures the
     * playback session is created on the Alarm stream from the start.
     */
    private boolean tryPlay(int resId) {
        AssetFileDescriptor afd = null;
        try {
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .setUsage(AudioAttributes.USAGE_ALARM)
                .build());

            afd = getResources().openRawResourceFd(resId);
            if (afd == null) {
                AzanDiagnostics.log(this, "OPEN_RAW_RESOURCE_FD_NULL resId=" + resId);
                return false;
            }
            mediaPlayer.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
            AzanDiagnostics.log(this, "SET_DATA_SOURCE_OK resId=" + resId);

            mediaPlayer.setOnCompletionListener(mp -> {
                AzanDiagnostics.log(this, "PLAYBACK_COMPLETED");
                stopSelf();
            });
            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                AzanDiagnostics.log(this, "MEDIAPLAYER_ERROR what=" + what + " extra=" + extra);
                stopSelf();
                return true;
            });

            mediaPlayer.prepare(); // synchronous — local raw resource, fast
            AzanDiagnostics.log(this, "PREPARE_OK");

            mediaPlayer.start();
            AzanDiagnostics.log(this, "START_CALLED isPlaying=" + mediaPlayer.isPlaying()
                + " volume(alarm stream)=" + currentAlarmVolumeInfo());
            return true;
        } catch (Exception e) {
            AzanDiagnostics.log(this, "TRY_PLAY_EXCEPTION resId=" + resId + " : " + e);
            return false;
        } finally {
            if (afd != null) {
                try { afd.close(); } catch (Exception ignored) { /* */ }
            }
        }
    }

    private String currentAlarmVolumeInfo() {
        try {
            AudioManager am = audioManager != null
                ? audioManager
                : (AudioManager) getSystemService(AUDIO_SERVICE);
            if (am == null) return "unavailable";
            int cur = am.getStreamVolume(AudioManager.STREAM_ALARM);
            int max = am.getStreamMaxVolume(AudioManager.STREAM_ALARM);
            return cur + "/" + max;
        } catch (Exception e) {
            return "error:" + e;
        }
    }

    private void requestAudioFocus() {
        audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);
        if (audioManager == null) {
            AzanDiagnostics.log(this, "AUDIO_MANAGER_UNAVAILABLE");
            return;
        }

        AudioAttributes attrs = new AudioAttributes.Builder()
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .setUsage(AudioAttributes.USAGE_ALARM)
            .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
                .setAudioAttributes(attrs)
                .setOnAudioFocusChangeListener(focusListener)
                .build();
            try {
                int result = audioManager.requestAudioFocus(audioFocusRequest);
                AzanDiagnostics.log(this, "AUDIO_FOCUS_REQUEST_RESULT=" + result
                    + " (1=GRANTED, 0=FAILED, 2=DELAYED)");
            } catch (Exception e) {
                AzanDiagnostics.log(this, "AUDIO_FOCUS_REQUEST_EXCEPTION: " + e);
            }
        } else {
            try {
                int result = audioManager.requestAudioFocus(
                    focusListener, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE);
                AzanDiagnostics.log(this, "AUDIO_FOCUS_REQUEST_RESULT(legacy)=" + result);
            } catch (Exception e) {
                AzanDiagnostics.log(this, "AUDIO_FOCUS_REQUEST_EXCEPTION(legacy): " + e);
            }
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
