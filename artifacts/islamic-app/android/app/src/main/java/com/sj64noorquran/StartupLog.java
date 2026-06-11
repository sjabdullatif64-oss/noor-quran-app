package com.sj64noorquran;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Ultra-reliable startup logger.
 * Uses ONLY raw java.io — zero Android-API dependencies.
 * Writes to [filesDir]/startup.log before every startup step.
 * On crash: log contains the last step reached.
 * On next launch: MainApplication saves the log before resetting.
 */
public final class StartupLog {

    private static volatile String filePath = null;

    /** Call FIRST in attachBaseContext, using base.getFilesDir(). */
    public static void init(String filesDirPath) {
        try {
            filePath = filesDirPath + "/startup.log";
        } catch (Throwable ignored) {}
    }

    /** Append a timestamped step entry. Never throws. */
    public static void step(String tag) {
        if (filePath == null) return;
        try {
            String line = new SimpleDateFormat("HH:mm:ss.SSS", Locale.US)
                .format(new Date()) + "  " + tag + "\n";
            FileOutputStream fos = new FileOutputStream(filePath, true);
            fos.write(line.getBytes("UTF-8"));
            fos.flush();
            fos.close();
            android.util.Log.d("NoorStartup", tag);
        } catch (Throwable ignored) {}
    }

    /** Write the final success marker at end of successful startup. */
    public static void markOK() {
        step("=== LAUNCH_OK ===");
    }

    /**
     * True if the last launch did NOT reach markOK() — i.e., it crashed.
     * Call BEFORE reset().
     */
    public static boolean hadCrash() {
        String c = read();
        if (c == null || c.trim().isEmpty()) return false;
        return !c.contains("LAUNCH_OK");
    }

    /** Read entire log file. Returns null if empty or missing. */
    public static String read() {
        if (filePath == null) return null;
        try {
            File f = new File(filePath);
            if (!f.exists() || f.length() == 0) return null;
            int len = (int) f.length();
            byte[] b = new byte[len];
            FileInputStream fis = new FileInputStream(f);
            int read = fis.read(b);
            fis.close();
            return new String(b, 0, read, "UTF-8");
        } catch (Throwable ignored) { return null; }
    }

    /** Truncate log file (start of new launch). */
    public static void reset() {
        if (filePath == null) return;
        try {
            new FileOutputStream(filePath, false).close();
        } catch (Throwable ignored) {}
    }
}
