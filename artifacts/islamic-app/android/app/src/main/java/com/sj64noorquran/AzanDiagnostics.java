package com.sj64noorquran;

import android.content.Context;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Persistent, always-on diagnostic log for the Azan alarm → audio pipeline.
 *
 * Unlike StartupLog (which resets on every app process start), this log
 * survives across app opens/closes and process deaths, so that when an Azan
 * fires while the app is closed, the user can open the app afterwards and
 * still see exactly what happened — no adb/Logcat access required.
 *
 * Only cleared when the user explicitly taps "Clear" in Azan Settings.
 */
public final class AzanDiagnostics {

    private static final String LOG_FILE  = "azan_diag.log";
    private static final int    MAX_CHARS = 30_000; // ~a few hundred lines; auto-trimmed

    public static synchronized void log(Context ctx, String tag) {
        if (ctx == null) return;
        try {
            String ts = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", Locale.US).format(new Date());
            String line = ts + "  " + tag + "\n";
            File f = new File(ctx.getFilesDir(), LOG_FILE);
            FileOutputStream fos = new FileOutputStream(f, true);
            fos.write(line.getBytes("UTF-8"));
            fos.flush();
            fos.close();
            trimIfNeeded(f);
        } catch (Throwable ignored) { /* diagnostics must never crash the app */ }
        try {
            android.util.Log.d("NoorAzan", tag);
        } catch (Throwable ignored) { /* */ }
    }

    private static void trimIfNeeded(File f) {
        try {
            if (f.length() <= MAX_CHARS) return;
            String content = readAll(f);
            if (content != null && content.length() > MAX_CHARS) {
                content = content.substring(content.length() - MAX_CHARS);
                FileOutputStream fos = new FileOutputStream(f, false);
                fos.write(content.getBytes("UTF-8"));
                fos.flush();
                fos.close();
            }
        } catch (Throwable ignored) { /* */ }
    }

    public static String read(Context ctx) {
        if (ctx == null) return null;
        try {
            File f = new File(ctx.getFilesDir(), LOG_FILE);
            if (!f.exists() || f.length() == 0) return null;
            return readAll(f);
        } catch (Throwable ignored) { return null; }
    }

    public static void clear(Context ctx) {
        if (ctx == null) return;
        try { new File(ctx.getFilesDir(), LOG_FILE).delete(); } catch (Throwable ignored) { /* */ }
    }

    private static String readAll(File f) throws Exception {
        byte[] b = new byte[(int) f.length()];
        FileInputStream fis = new FileInputStream(f);
        int n = fis.read(b);
        fis.close();
        return new String(b, 0, n, "UTF-8");
    }
}
