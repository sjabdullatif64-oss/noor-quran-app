package com.sj64noorquran;

import android.content.Context;
import android.content.Intent;
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
 *  1. Appends the crash to StartupLog (raw file IO — never fails)
 *  2. Saves the full log to SharedPreferences so the NEXT launch shows it
 *  3. Also writes to Android/data/<pkg>/files/crash_report.txt (file manager readable)
 *  4. Tries to start LogViewerActivity immediately
 *  5. Delegates to the previous handler
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
            // Build stack trace string
            StringWriter sw = new StringWriter(4096);
            ex.printStackTrace(new PrintWriter(sw));

            // Append crash info to startup log (raw file — most reliable)
            StartupLog.step("=== UNCAUGHT_EXCEPTION ===");
            StartupLog.step("Thread: " + thread.getName());
            StartupLog.step("Exception: " + ex.getClass().getName()
                + ": " + ex.getMessage());
            // Truncated inline stack
            String stack = sw.toString().replace("\n", " | ");
            StartupLog.step("Stack: " + stack.substring(0, Math.min(600, stack.length())));

            // Walk cause chain
            Throwable cause = ex.getCause();
            int depth = 0;
            while (cause != null && depth < 3) {
                StartupLog.step("Caused by: " + cause.getClass().getName()
                    + ": " + cause.getMessage());
                cause = cause.getCause();
                depth++;
            }

            // Save full log to SharedPreferences (survives process restart)
            String log = StartupLog.read();
            if (log != null) {
                ctx.getSharedPreferences(MainApplication.PREF_DIAG, Context.MODE_PRIVATE)
                    .edit()
                    .putString(MainApplication.KEY_PREV_LOG, log)
                    .commit();
            }

            // Also write human-readable report to external storage
            writeCrashFile(ctx, buildReport(ex, thread, log));

            // Try to start LogViewerActivity (may not work if process dying fast)
            try {
                Intent intent = new Intent(ctx, LogViewerActivity.class);
                intent.addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK |
                    Intent.FLAG_ACTIVITY_CLEAR_TASK);
                ctx.startActivity(intent);
                Thread.sleep(800);
            } catch (Throwable ignored) {}

        } catch (Throwable ignored) {
            // Never let the handler crash itself
        }

        if (previous != null) previous.uncaughtException(thread, ex);
    }

    /**
     * Write report to Android/data/com.sj64noorquran/files/crash_report.txt
     * (readable via file manager without ADB).
     */
    public static void writeCrashFile(Context ctx, String report) {
        try {
            File dir = ctx.getExternalFilesDir(null);
            if (dir != null) {
                if (!dir.exists()) dir.mkdirs();
                File f = new File(dir, "crash_report.txt");
                FileWriter fw = new FileWriter(f, false);
                fw.write(report);
                fw.flush();
                fw.close();
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

    private String buildReport(Throwable ex, Thread thread, String startupLog) {
        StringWriter sw = new StringWriter(4096);
        ex.printStackTrace(new PrintWriter(sw));
        StringBuilder causes = new StringBuilder();
        Throwable cause = ex.getCause();
        int depth = 0;
        while (cause != null && depth < 5) {
            StringWriter csw = new StringWriter(2048);
            cause.printStackTrace(new PrintWriter(csw));
            causes.append("\nCaused by: ").append(cause.getClass().getName())
                  .append(": ").append(cause.getMessage())
                  .append("\n").append(csw);
            cause = cause.getCause();
            depth++;
        }
        return "=== NOOR QURAN CRASH REPORT ===\n"
            + "Time    : " + new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(new Date()) + "\n"
            + "Device  : " + Build.MANUFACTURER + " " + Build.MODEL + " (" + Build.DEVICE + ")\n"
            + "Android : " + Build.VERSION.RELEASE + " (API " + Build.VERSION.SDK_INT + ")\n"
            + "ABI     : " + Build.SUPPORTED_ABIS[0] + "\n"
            + "Thread  : " + thread.getName() + "\n"
            + "\nException: " + ex.getClass().getName()
            + "\nMessage : " + ex.getMessage()
            + "\n\nStack trace:\n" + sw
            + causes
            + "\n\n--- Startup steps before crash ---\n"
            + (startupLog != null ? startupLog : "(none)")
            + "\n=== END ===";
    }
}
