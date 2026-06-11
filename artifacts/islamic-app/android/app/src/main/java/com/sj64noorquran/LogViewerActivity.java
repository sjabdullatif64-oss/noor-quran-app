package com.sj64noorquran;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup.LayoutParams;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * DIAGNOSTIC LAUNCHER — self-contained, no dependencies on StartupLog/CrashHandler.
 *
 * Flow:
 *  1. App opens → LogViewerActivity shows two buttons
 *  2. Tap "Open Main App" → THIS activity writes a pre-launch record to
 *     BOTH SharedPreferences AND a file, then starts MainActivity
 *  3. MainActivity crashes → process dies
 *  4. Reopen app → LogViewerActivity reads the pre-launch record it wrote
 *  5. Tap "Show Saved Log" → shows everything saved (pre-launch + StartupLog if any)
 *
 * Writes to two independent stores so at least one survives:
 *   • SharedPreferences "noor_diag" / "viewer_log"
 *   • Internal file: getFilesDir()/viewer_log.txt  (+ hardcoded path fallback)
 */
public class LogViewerActivity extends Activity {

    private static final String PREF_FILE = "noor_diag";
    private static final String KEY_LOG   = "viewer_log";
    private static final String LOG_FILE  = "viewer_log.txt";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xFF0D1A0F);
        setContentView(root);

        // ── Title ────────────────────────────────────────────────────────────
        TextView title = new TextView(this);
        title.setText("Noor Quran — Diagnostic");
        title.setTextColor(0xFF88FFAA);
        title.setTextSize(20);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setGravity(Gravity.CENTER);
        title.setPadding(dp(16), dp(48), dp(16), dp(4));
        root.addView(title);

        TextView sub = new TextView(this);
        sub.setText("v1.0.11  |  Build #126");
        sub.setTextColor(0xFF445544);
        sub.setTextSize(11);
        sub.setGravity(Gravity.CENTER);
        sub.setPadding(dp(16), 0, dp(16), dp(24));
        root.addView(sub);

        // ── Open Main App button ──────────────────────────────────────────────
        Button openBtn = makePrimaryBtn("▶  Open Main App");
        openBtn.setOnClickListener(v -> launchMainApp());
        root.addView(openBtn, wideParams(dp(16), dp(4)));

        // ── Divider ───────────────────────────────────────────────────────────
        TextView div = new TextView(this);
        div.setText("───────── saved log ─────────");
        div.setTextColor(0xFF334433);
        div.setTextSize(11);
        div.setGravity(Gravity.CENTER);
        div.setPadding(0, dp(28), 0, dp(8));
        root.addView(div);

        // ── Read saved log from BOTH sources ─────────────────────────────────
        final String combinedLog = readSavedLog();

        TextView statusTv = new TextView(this);
        if (combinedLog != null) {
            int lines = combinedLog.split("\n").length;
            statusTv.setText("✅  Saved log: " + lines + " lines");
            statusTv.setTextColor(0xFF00DD66);
        } else {
            statusTv.setText("⬜  No saved log  (tap Open Main App, crash, then reopen)");
            statusTv.setTextColor(0xFF667766);
        }
        statusTv.setTextSize(12);
        statusTv.setGravity(Gravity.CENTER);
        statusTv.setPadding(dp(16), dp(4), dp(16), dp(12));
        root.addView(statusTv);

        // ── Log action buttons ────────────────────────────────────────────────
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER);
        row.setPadding(dp(8), 0, dp(8), dp(8));

        Button showBtn  = makeSecondaryBtn("Show Saved Log");
        Button shareBtn = makeSecondaryBtn("Share Log");
        Button clearBtn = makeSecondaryBtn("Clear Log");

        boolean hasLog = combinedLog != null;
        showBtn.setEnabled(hasLog);   showBtn.setAlpha(hasLog ? 1f : 0.35f);
        shareBtn.setEnabled(hasLog);  shareBtn.setAlpha(hasLog ? 1f : 0.35f);
        clearBtn.setEnabled(hasLog);  clearBtn.setAlpha(hasLog ? 1f : 0.35f);

        showBtn.setOnClickListener(v -> showLogScreen(combinedLog));
        shareBtn.setOnClickListener(v -> shareText(combinedLog, "Noor Quran Startup Log"));
        clearBtn.setOnClickListener(v -> {
            clearSavedLog();
            Toast.makeText(this, "Log cleared", Toast.LENGTH_SHORT).show();
            recreate();
        });

        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f);
        bp.setMargins(dp(4), 0, dp(4), 0);
        showBtn.setLayoutParams(bp);
        shareBtn.setLayoutParams(new LinearLayout.LayoutParams(bp));
        clearBtn.setLayoutParams(new LinearLayout.LayoutParams(bp));
        row.addView(showBtn);
        row.addView(shareBtn);
        row.addView(clearBtn);
        root.addView(row, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));
    }

    // ── Launch MainActivity — write pre-launch log FIRST ─────────────────────

    private void launchMainApp() {
        String ts = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", Locale.US).format(new Date());
        String entry = "=== PRE-LAUNCH RECORD ===\n"
            + "Written by  : LogViewerActivity (guaranteed — no crash dependency)\n"
            + "Timestamp   : " + ts + "\n"
            + "Device      : " + Build.MANUFACTURER + " " + Build.MODEL + " (" + Build.DEVICE + ")\n"
            + "Android     : " + Build.VERSION.RELEASE + " (API " + Build.VERSION.SDK_INT + ")\n"
            + "ABI         : " + Build.SUPPORTED_ABIS[0] + "\n"
            + "\nAction      : LAUNCHING MainActivity.class NOW\n"
            + "If you see this log, the crash is in MainActivity or later.\n"
            + "If you do NOT see this log, the crash is in MainApplication init.\n"
            + "\n--- StartupLog (from MainApplication) ---\n"
            + readStartupLogFile()
            + "\n--- SharedPrefs prev_log (from CrashHandler) ---\n"
            + readSharedPrefLog()
            + "\n=== END PRE-LAUNCH RECORD ===\n";

        // Write 1: SharedPreferences (most reliable on Android)
        try {
            getSharedPreferences(PREF_FILE, MODE_PRIVATE)
                .edit().putString(KEY_LOG, entry).commit();
        } catch (Throwable ignored) {}

        // Write 2: internal file via getFilesDir()
        writeFile(getFilesDir().getAbsolutePath() + "/" + LOG_FILE, entry);

        // Write 3: hardcoded path fallback
        writeFile("/data/data/com.sj64noorquran/files/" + LOG_FILE, entry);

        // Now start MainActivity
        Intent i = new Intent(this, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(i);
        // Do NOT finish — diagnostic screen stays in back stack
    }

    // ── Read from BOTH sources, return whichever has content ─────────────────

    private String readSavedLog() {
        StringBuilder sb = new StringBuilder();

        // Source 1: SharedPreferences (KEY_LOG — written by us above)
        try {
            String sp = getSharedPreferences(PREF_FILE, MODE_PRIVATE)
                .getString(KEY_LOG, null);
            if (sp != null && !sp.isEmpty()) {
                sb.append("[Source: SharedPreferences viewer_log]\n").append(sp).append("\n\n");
            }
        } catch (Throwable ignored) {}

        // Source 2: Internal file via getFilesDir()
        try {
            String fileContent = readFile(getFilesDir().getAbsolutePath() + "/" + LOG_FILE);
            if (fileContent != null && !fileContent.isEmpty()) {
                sb.append("[Source: internal file viewer_log.txt]\n").append(fileContent).append("\n\n");
            }
        } catch (Throwable ignored) {}

        // Source 3: SharedPreferences KEY_PREV_LOG (from MainApplication/CrashHandler)
        try {
            String prev = getSharedPreferences(PREF_FILE, MODE_PRIVATE)
                .getString(MainApplication.KEY_PREV_LOG, null);
            if (prev != null && !prev.isEmpty()) {
                sb.append("[Source: SharedPreferences prev_log (CrashHandler)]\n")
                  .append(prev).append("\n\n");
            }
        } catch (Throwable ignored) {}

        String result = sb.toString().trim();
        return result.isEmpty() ? null : result;
    }

    private void clearSavedLog() {
        try {
            getSharedPreferences(PREF_FILE, MODE_PRIVATE)
                .edit()
                .remove(KEY_LOG)
                .remove(MainApplication.KEY_PREV_LOG)
                .commit();
        } catch (Throwable ignored) {}
        try { new File(getFilesDir(), LOG_FILE).delete(); } catch (Throwable ignored) {}
        try { new File("/data/data/com.sj64noorquran/files/" + LOG_FILE).delete(); } catch (Throwable ignored) {}
        try { StartupLog.reset(); } catch (Throwable ignored) {}
    }

    // ── Helpers: file I/O (raw — no Android API) ─────────────────────────────

    private static void writeFile(String path, String content) {
        try {
            File f = new File(path);
            File dir = f.getParentFile();
            if (dir != null && !dir.exists()) dir.mkdirs();
            FileOutputStream fos = new FileOutputStream(f, false);
            fos.write(content.getBytes("UTF-8"));
            fos.flush();
            fos.close();
        } catch (Throwable ignored) {}
    }

    private static String readFile(String path) {
        try {
            File f = new File(path);
            if (!f.exists() || f.length() == 0) return null;
            byte[] b = new byte[(int) f.length()];
            FileInputStream fis = new FileInputStream(f);
            int n = fis.read(b);
            fis.close();
            return new String(b, 0, n, "UTF-8");
        } catch (Throwable ignored) { return null; }
    }

    private String readStartupLogFile() {
        // Read whatever StartupLog wrote (startup.log in internal files dir)
        try {
            String v = readFile(getFilesDir().getAbsolutePath() + "/startup.log");
            return v != null ? v : "(startup.log not found or empty)";
        } catch (Throwable ignored) { return "(error reading startup.log)"; }
    }

    private String readSharedPrefLog() {
        try {
            String v = getSharedPreferences(PREF_FILE, MODE_PRIVATE)
                .getString(MainApplication.KEY_PREV_LOG, null);
            return v != null ? v : "(none)";
        } catch (Throwable ignored) { return "(error reading SharedPrefs)"; }
    }

    // ── Log screen ────────────────────────────────────────────────────────────

    private void showLogScreen(String log) {
        LinearLayout root2 = new LinearLayout(this);
        root2.setOrientation(LinearLayout.VERTICAL);
        root2.setBackgroundColor(0xFF0D0D0D);
        setContentView(root2);

        TextView hdr = new TextView(this);
        hdr.setText("Startup Log");
        hdr.setTextColor(0xFFFF5555);
        hdr.setTextSize(16);
        hdr.setTypeface(Typeface.DEFAULT_BOLD);
        hdr.setPadding(dp(16), dp(40), dp(16), dp(4));
        root2.addView(hdr);

        ScrollView scroll = new ScrollView(this);
        scroll.setLayoutParams(new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, 0, 1f));
        scroll.setBackgroundColor(0xFF111111);
        TextView tv = new TextView(this);
        tv.setText(log != null ? log : "(empty)");
        tv.setTextColor(0xFF00FF88);
        tv.setTextSize(9.5f);
        tv.setTypeface(Typeface.MONOSPACE);
        tv.setPadding(dp(10), dp(10), dp(10), dp(10));
        scroll.addView(tv);
        root2.addView(scroll);

        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER);
        row.setPadding(dp(8), dp(8), dp(8), dp(20));
        row.setBackgroundColor(0xFF111111);

        Button copyBtn = makeSecondaryBtn("Copy");
        copyBtn.setOnClickListener(v -> {
            ClipboardManager cm = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
            if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("NoorLog", log != null ? log : ""));
            Toast.makeText(this, "Copied!", Toast.LENGTH_SHORT).show();
        });
        Button shareBtn = makeSecondaryBtn("Share");
        shareBtn.setOnClickListener(v -> shareText(log, "Noor Quran Startup Log"));
        Button backBtn = makeSecondaryBtn("← Back");
        backBtn.setOnClickListener(v -> recreate());

        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f);
        bp.setMargins(dp(4), 0, dp(4), 0);
        copyBtn.setLayoutParams(bp);
        shareBtn.setLayoutParams(new LinearLayout.LayoutParams(bp));
        backBtn.setLayoutParams(new LinearLayout.LayoutParams(bp));
        row.addView(copyBtn);
        row.addView(shareBtn);
        row.addView(backBtn);
        root2.addView(row);

        scroll.post(() -> scroll.fullScroll(ScrollView.FOCUS_DOWN));
    }

    private void shareText(String text, String subject) {
        Intent i = new Intent(Intent.ACTION_SEND);
        i.setType("text/plain");
        i.putExtra(Intent.EXTRA_TEXT, text != null ? text : "(empty)");
        i.putExtra(Intent.EXTRA_SUBJECT, subject);
        startActivity(Intent.createChooser(i, "Share log"));
    }

    private Button makePrimaryBtn(String text) {
        Button b = new Button(this);
        b.setText(text);
        b.setTextColor(Color.WHITE);
        b.setBackgroundColor(0xFF1A5C38);
        b.setTextSize(16);
        b.setPadding(dp(16), dp(14), dp(16), dp(14));
        return b;
    }

    private Button makeSecondaryBtn(String text) {
        Button b = new Button(this);
        b.setText(text);
        b.setTextColor(Color.WHITE);
        b.setBackgroundColor(0xFF2A3A2A);
        b.setTextSize(12);
        return b;
    }

    private LinearLayout.LayoutParams wideParams(int hMargin, int vMargin) {
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(
            LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        p.setMargins(hMargin, vMargin, hMargin, vMargin);
        return p;
    }

    private int dp(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }
}
