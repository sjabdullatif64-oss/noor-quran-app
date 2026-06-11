package com.sj64noorquran;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import java.io.File;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Global uncaught-exception handler.
 *
 * On any crash:
 *  1. Writes full report to SharedPreferences ("noor_debug" → "crash")
 *  2. Writes full report to a FILE at Android/data/com.sj64noorquran/files/crash_report.txt
 *     — readable by any file manager app without ADB
 *  3. Tries to start CrashActivity immediately
 *  4. Delegates to previous handler so the OS still records the crash
 *
 * On the NEXT launch, MainApplication.onCreate() detects the saved report and
 * routes to CrashActivity before MainActivity can crash again.
 */
public final class CrashHandler implements Thread.UncaughtExceptionHandler {

    private final Context ctx;
    private final Thread.UncaughtExceptionHandler previous;

    public CrashHandler(Context ctx, Thread.UncaughtExceptionHandler previous) {
        this.ctx      = ctx.getApplicationContext();
        this.previous = previous;
    }

    @Override
    public void uncaughtException(Thread thread, Throwable ex) {
        try {
            // Read last breadcrumb — tells us how far startup got
            String crumb = "(none)";
            try {
                crumb = ctx.getSharedPreferences("noor_debug", Context.MODE_PRIVATE)
                           .getString("last_crumb", "(none)");
            } catch (Throwable ignored) {}

            String report = buildReport(ex, thread, crumb);

            // ── Persist in SharedPreferences (survives restart) ───────────────
            SharedPreferences prefs =
                ctx.getSharedPreferences("noor_debug", Context.MODE_PRIVATE);
            prefs.edit().putString("crash", report).commit();

            // ── Write to file readable via file manager ────────────────────────
            writeCrashFile(ctx, report);

            // ── Try to show CrashActivity immediately ──────────────────────────
            Intent intent = new Intent(ctx, CrashActivity.class);
            intent.putExtra("trace", report);
            intent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_CLEAR_TASK |
                Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS
            );
            ctx.startActivity(intent);
            Thread.sleep(800);
        } catch (Throwable ignored) {
            // Never let the handler crash itself
        }

        if (previous != null) {
            previous.uncaughtException(thread, ex);
        }
    }

    /**
     * Write crash report to
     * /sdcard/Android/data/com.sj64noorquran/files/crash_report.txt
     *
     * Accessible without ADB:
     *   File manager → Android/data/com.sj64noorquran/files/crash_report.txt
     */
    public static void writeCrashFile(Context ctx, String report) {
        try {
            // External files dir: Android/data/<pkg>/files/ — no permission needed
            File dir = ctx.getExternalFilesDir(null);
            if (dir != null) {
                if (!dir.exists()) dir.mkdirs();
                File f = new File(dir, "crash_report.txt");
                FileWriter fw = new FileWriter(f, false);
                fw.write(report);
                fw.flush();
                fw.close();
                android.util.Log.e("NoorCrash",
                    "Crash report written to: " + f.getAbsolutePath());
            }
        } catch (Throwable ignored) {}

        // Fallback: internal storage
        try {
            File f = new File(ctx.getFilesDir(), "crash_report.txt");
            FileWriter fw = new FileWriter(f, false);
            fw.write(report);
            fw.flush();
            fw.close();
        } catch (Throwable ignored) {}
    }

    private String buildReport(Throwable ex, Thread thread, String lastCrumb) {
        StringWriter sw = new StringWriter(4096);
        ex.printStackTrace(new PrintWriter(sw));

        // Walk the cause chain
        StringBuilder causes = new StringBuilder();
        Throwable cause = ex.getCause();
        int depth = 0;
        while (cause != null && depth < 5) {
            StringWriter csw = new StringWriter(2048);
            cause.printStackTrace(new PrintWriter(csw));
            causes.append("\nCaused by: ").append(cause.getClass().getName())
                  .append(": ").append(cause.getMessage()).append("\n")
                  .append(csw.toString());
            cause = cause.getCause();
            depth++;
        }

        return "=== NOOR QURAN CRASH REPORT ===\n"
            + "Time      : " + new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(new Date()) + "\n"
            + "Device    : " + Build.MANUFACTURER + " " + Build.MODEL
                             + " (" + Build.DEVICE + ")\n"
            + "Android   : " + Build.VERSION.RELEASE
                             + " (API " + Build.VERSION.SDK_INT + ")\n"
            + "ABI       : " + Build.SUPPORTED_ABIS[0] + "\n"
            + "Thread    : " + thread.getName() + "\n"
            + "Last crumb: " + lastCrumb + "\n"
            + "\nException : " + ex.getClass().getName()
            + "\nMessage   : " + ex.getMessage()
            + "\n\nStack trace:\n"
            + sw.toString()
            + causes.toString()
            + "\n=== END ===";
    }
}
